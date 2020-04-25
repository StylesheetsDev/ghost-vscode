const vscode = require('vscode');
const GhostAdminAPI = require('@tryghost/admin-api');
const path = require('path');
const showdown = require('showdown');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const api = new GhostAdminAPI({
		url: vscode.workspace.getConfiguration('ghost').apiUrl,
		version: vscode.workspace.getConfiguration('ghost').apiVersion,
		key: vscode.workspace.getConfiguration('ghost').adminApiKey
	});

	let disposable = vscode.commands.registerCommand('vscode-ghost-extension.createPost', function () {

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage("Provide some content for the post");
			return;
		}

		const converter = new showdown.Converter({
			noHeaderId: true
		});

		let post_markdown = editor.document.getText();
		let post_title;
		let post_body;
		let post_status = 'draft';
		let post_tags = [];

		for (let i = 0; i < post_markdown.length; i++) {
			if (post_markdown.charAt(i) === "\n") {
				post_title = post_markdown.substring(2, i);
				post_body = post_markdown.substring(i + 1);
				break;
			}
		}

		let post_html = converter.makeHtml(post_body);

		const tagsInput = vscode.window.createInputBox();
		const quickPick = vscode.window.createQuickPick();
		quickPick.items = [
			{
				label: 'Publish'
			},
			{
				label: 'Save to Drafts'
			}
		];

		tagsInput.title = "Enter comma(,) seprated tags for your post";
		tagsInput.onDidAccept(() => {
			post_tags = (tagsInput.value === "" ? [] : tagsInput.value.split(', '));
			console.log(post_tags)
			quickPick.show();

			tagsInput.dispose()
		})
		tagsInput.show()


		quickPick.onDidChangeSelection(([item]) => {
			if (item.label === "Publish") {
				post_status = 'published'
			}

			api.posts.add({
				title: post_title,
				html: post_html,
				status: post_status,
				tags: post_tags
			}, {
				source: 'html'
			})
				.then(res => {
					if (res.id) {
						vscode.window.showInformationMessage('Post successfully created')
					}
				})
				.catch(err => {
					console.log(err)
					vscode.window.showInformationMessage('Error creating post, check console log for more info.')
				});

			quickPick.dispose();
		})
		quickPick.onDidHide(() => quickPick.dispose());

	});

	context.subscriptions.push(disposable);

	let update_post_command = vscode.commands.registerCommand('vscode-ghost-extension.updatePost', async () => {
		let post_id = ""
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage("Provide some content for the post");
			return;
		}

		const converter = new showdown.Converter({
			noHeaderId: true
		});

		let post_markdown = editor.document.getText();
		let post_title;
		let post_body;
		let post_updated_at;

		for (let i = 0; i < post_markdown.length; i++) {
			if (post_markdown.charAt(i) === "\n") {
				post_title = post_markdown.substring(2, i);
				post_body = post_markdown.substring(i + 1);
				break;
			}
		}

		let post_html = converter.makeHtml(post_body);

		let posts = await api.posts.browse({
			fields: ['title', 'id', 'updated_at']
		})

		let posts_quickpick = vscode.window.createQuickPick()
		posts_quickpick.items = posts.map((post) => ({
			label: post.title,
			post_id: post.id,
			post_updated_at: post.updated_at
		}))
		posts_quickpick.onDidChangeSelection(([item]) => {
			post_id = item['post_id'];
			post_updated_at = item['post_updated_at'];

			api.posts.edit({
				id: post_id,
				title: post_title,
				html: post_html,
				updated_at: post_updated_at
			}, {
				source: 'html'
			})
				.then(res => {
					if (res.id) {
						vscode.window.showInformationMessage('Post updated')
					}
				})
				.catch(err => {
					console.log(err)
					vscode.window.showInformationMessage('Error updating the post')
				})

			posts_quickpick.dispose()
		})
		posts_quickpick.show()
		posts_quickpick.onDidHide(() => posts_quickpick.dispose())
	});

	context.subscriptions.push(update_post_command)
}
exports.activate = activate;

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
