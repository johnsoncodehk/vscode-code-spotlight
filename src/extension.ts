import * as vscode from 'vscode';

const decorations = [
	vscode.window.createTextEditorDecorationType({ opacity: '1' }),
	vscode.window.createTextEditorDecorationType({ opacity: '0.8' }),
	vscode.window.createTextEditorDecorationType({ opacity: '0.6' }),
	vscode.window.createTextEditorDecorationType({ opacity: '0.5' }),
	vscode.window.createTextEditorDecorationType({ opacity: '0.45' }),
	vscode.window.createTextEditorDecorationType({ opacity: '0.4' }),
	vscode.window.createTextEditorDecorationType({ opacity: '0.35' }),
	vscode.window.createTextEditorDecorationType({ opacity: '0.3' }),
	vscode.window.createTextEditorDecorationType({ opacity: '0.25' }),
	vscode.window.createTextEditorDecorationType({ opacity: '0.2' }),
	vscode.window.createTextEditorDecorationType({ opacity: '0.15' }),
	vscode.window.createTextEditorDecorationType({ opacity: '0.1' }),
];
const decorationRanges = decorations.map(() => [] as vscode.Range[]);

let subscription: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {

	vscode.commands.registerCommand('toggleCodeSpotlight', () => {
		if (subscription) {
			subscription.dispose();
			subscription = undefined;
		}
		else {
			subscription = vscode.window.onDidChangeTextEditorSelection(update);
		}
		update();
	});

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
					const range = selectionRanges[i];
					const childRange = i >= 1 ? selectionRanges[i - 1] : undefined;
					let decoration = remain.shift();
					let decorationRange = ranges.shift();
					if (!decoration || !decorationRange) {
						decoration = decorations[decorations.length - 1];
						decorationRange = decorationRanges[decorations.length - 1];
					}
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
