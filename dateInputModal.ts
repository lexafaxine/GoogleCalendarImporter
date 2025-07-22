import { App, Modal, TextComponent } from 'obsidian';

export class DateInputModal extends Modal {
	private dateInput: TextComponent;
	private onSubmit: (date: string) => void;

	constructor(app: App, onSubmit: (date: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Insert Google Calendar Block' });

		const inputContainer = contentEl.createDiv();
		inputContainer.createEl('label', { text: 'Date' });
		
		this.dateInput = new TextComponent(inputContainer);
		this.dateInput.setPlaceholder('2024-01-15 or leave empty for today');
		this.dateInput.inputEl.style.width = '100%';
		this.dateInput.inputEl.style.marginTop = '8px';

		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.marginTop = '20px';
		buttonContainer.style.textAlign = 'right';

		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.style.marginRight = '10px';
		cancelButton.onclick = () => this.close();

		const submitButton = buttonContainer.createEl('button', { text: 'Insert', cls: 'mod-cta' });
		submitButton.onclick = () => {
			const dateValue = this.dateInput.getValue().trim();
			this.onSubmit(dateValue);
			this.close();
		};

		this.dateInput.inputEl.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				submitButton.click();
			}
		});

		setTimeout(() => this.dateInput.inputEl.focus(), 100);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}