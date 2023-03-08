import * as vscode from 'vscode';

let subscription: vscode.Disposable | undefined;
let pows = [
	3 * (1.5 ** -4),
	3 * (1.5 ** -3),
	3 * (1.5 ** -2),
	3 * (1.5 ** -1),
	3 * (1.5 ** 0),
	3 * (1.5 ** 1),
	3 * (1.5 ** 2),
	3 * (1.5 ** 3),
	3 * (1.5 ** 4),
];
let pow = pows[4];

const decorations: vscode.TextEditorDecorationType[] = [];
const decorationRanges: vscode.Range[][] = [];

export function activate(context: vscode.ExtensionContext) {

	vscode.commands.registerCommand('codeSpotlight.toggle', () => {
		if (subscription) {
			subscription.dispose();
			subscription = undefined;
			vscode.commands.executeCommand('setContext', 'codeSpotlight.enabled', false);
		}
		else {
			subscription = vscode.window.onDidChangeTextEditorSelection(update);
			vscode.commands.executeCommand('setContext', 'codeSpotlight.enabled', true);
		}
		update();
	});

	vscode.commands.registerCommand('codeSpotlight.enhance', () => {
		if (pows.indexOf(pow) >= pows.length - 1) {
			return;
		}
		pow = pows[Math.min(pows.length - 1, pows.indexOf(pow) + 1)];
		updateDecorations();
	});

	vscode.commands.registerCommand('codeSpotlight.weaken', () => {
		if (pows.indexOf(pow) <= 0) {
			return;
		}
		pow = pows[Math.max(0, pows.indexOf(pow) - 1)];
		updateDecorations();
	});

	updateDecorations();

	function updateDecorations() {

		vscode.commands.executeCommand('setContext', 'codeSpotlight.enhance.enabled', pow < pows[pows.length - 1]);
		vscode.commands.executeCommand('setContext', 'codeSpotlight.weaken.enabled', pow > pows[0]);

		const oldDecorations = [...decorations];
		decorations.length = 0;
		decorationRanges.length = 0;
		for (let i = 0; i < 10; i++) {
			const opacity = Math.max(0.1, Math.pow(0.9, i * pow));
			decorations.push(vscode.window.createTextEditorDecorationType({ opacity: opacity.toString() }));
			decorationRanges.push([]);
			if (opacity <= 0.1) {
				break;
			}
		}
		update();
		setTimeout(() => {
			for (let i = 0; i < oldDecorations.length; i++) {
				vscode.window.activeTextEditor?.setDecorations(oldDecorations[i], []);
			}
		}, 100);
	}

	async function update() {

		if (!vscode.window.activeTextEditor) {
			return;
		}

		const editor = vscode.window.activeTextEditor;
		const selectionRangesResults = await vscode.commands.executeCommand<{
			startLineNumber: number;
			startColumn: number;
			endLineNumber: number;
			endColumn: number;
		}[][]>(
			'_executeSelectionRangeProvider',
			editor.document.uri,
			editor.selections.map(selection => selection.active),
		) ?? [];

		for (const ranges of decorationRanges) {
			ranges.length = 0;
		}

		if (isEnabled()) {
			for (const selectionRanges of selectionRangesResults) {
				const remain = [...decorations];
				const ranges = [...decorationRanges];
				for (let i = 0; i < selectionRanges.length; i++) {
					let decoration = remain.shift();
					let decorationRange = ranges.shift();
					if (!decoration || !decorationRange) {
						decoration = decorations[decorations.length - 1];
						decorationRange = decorationRanges[decorations.length - 1];
					}
					const range = selectionRanges[i];
					const childRange = i >= 1 ? selectionRanges[i - 1] : undefined;
					if (!childRange) {
						decorationRange.push(new vscode.Range(range.startLineNumber - 1, range.startColumn - 1, range.endLineNumber - 1, range.endColumn - 1));
					}
					else {
						decorationRange.push(new vscode.Range(range.startLineNumber - 1, range.startColumn - 1, childRange.startLineNumber - 1, childRange.startColumn - 1));
						decorationRange.push(new vscode.Range(childRange.endLineNumber - 1, childRange.endColumn - 1, range.endLineNumber - 1, range.endColumn - 1));
					}
				}
			}
		}

		for (let i = 0; i < decorations.length; i++) {
			editor.setDecorations(decorations[i], decorationRanges[i]);
		}
	}

	function isEnabled() {
		return !!subscription;
	}
}

export function deactivate() {
	subscription?.dispose();
}
