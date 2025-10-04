import { App, Modal, TextComponent, ButtonComponent } from 'obsidian';

export class DateInputModal extends Modal {
	private dateInput: TextComponent;
	private onSubmit: (date: string) => void;

	constructor(app: App, onSubmit: (date: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass('google-calendar-modal');
		contentEl.createEl('h2', { text: 'Insert Google Calendar block' });

		const inputContainer = contentEl.createDiv();
		inputContainer.createEl('label', { text: 'Date' });
		
		this.dateInput = new TextComponent(inputContainer);
		this.dateInput.setPlaceholder('2024-01-15 or leave empty for today');
		this.dateInput.inputEl.addClass('date-input');

		const buttonContainer = contentEl.createDiv('button-container');

		new ButtonComponent(buttonContainer)
			.setButtonText('Cancel')
			.onClick(() => this.close());

		new ButtonComponent(buttonContainer)
			.setButtonText('Insert')
			.setCta()
			.onClick(() => {
				const dateValue = this.dateInput.getValue().trim();
				this.onSubmit(dateValue);
				this.close();
			});

		this.dateInput.inputEl.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				const dateValue = this.dateInput.getValue().trim();
				this.onSubmit(dateValue);
				this.close();
			}
		});

		setTimeout(() => this.dateInput.inputEl.focus(), 100);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}