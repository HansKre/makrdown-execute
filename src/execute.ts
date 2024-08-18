import * as vscode from 'vscode';
import { exec } from './extension';
import { hasOwnProperties } from 'ts-type-safe';

const DEBUG_OUT = true;

let lastUsedTerminal: vscode.Terminal | undefined;
let didRegisterOnDidCloseTerminal = false;

function sendToTerminal(term: vscode.Terminal, command: string) {
  lastUsedTerminal = term;
  if (!didRegisterOnDidCloseTerminal) {
    vscode.window.onDidCloseTerminal((terminal) => {
      if (terminal === lastUsedTerminal) {
        lastUsedTerminal = undefined;
      }
    });

    vscode.window.onDidChangeActiveTerminal((terminal) => {
      lastUsedTerminal = terminal;
    });

    didRegisterOnDidCloseTerminal = true;
  }

  term.show();
  term.sendText(command);

  vscode.window.showInformationMessage(
    'Code block sent to terminal for execution!'
  );
}

/**
 * Method to execute a command in the terminal.
 * Aquires a non-busy terminal, shows and focuses at it
 * and executes the command.
 *
 * @param command a string of commands to execute as a shell command
 * @returns nothing
 */
export async function execute(command: string | null): Promise<void> {
  if (!command) {
    return;
  }

  // get active terminal or create new one
  let term = lastUsedTerminal || vscode.window.activeTerminal;

  if (!term) {
    DEBUG_OUT &&
      console.log(
        'vscode.window.terminals.length',
        vscode.window.terminals.length
      );
    DEBUG_OUT &&
      console.log('No active terminal. Trying to find an available one.');

    term = await findAsyncSequential(vscode.window.terminals, async (t) => {
      if (t.exitStatus) {
        return false;
      }
      return t.exitStatus === undefined;
    });

    if (!term) {
      DEBUG_OUT &&
        console.log('No available terminal found. Creating new one.');
      term = vscode.window.createTerminal();
    }

    sendToTerminal(term, command);
    return;
  }
  // execute the command in the new terminal
  sendToTerminal(term, command);
}

async function findAsyncSequential<T>(
  array: readonly T[],
  predicate: (t: T) => Promise<boolean>
): Promise<T | undefined> {
  for (const t of array) {
    if (await predicate(t)) {
      return t;
    }
  }
  return undefined;
}
