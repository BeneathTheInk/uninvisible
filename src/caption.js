export function setCaption(){
	var Uninvisible = this;

	var title = Uninvisible.currentImageOptions.title || (Uninvisible.sourceElement != null ? Uninvisible.sourceElement.dataset.uninvisibleTitle : null);
	var text = Uninvisible.currentImageOptions.text || (Uninvisible.sourceElement != null ?  Uninvisible.sourceElement.dataset.uninvisibleText : null);

	if(title || text) Uninvisible.captionContainer.style.display = 'block';
	if(title && title.trim().length){
		Uninvisible.captionTitle.innerHTML = title;
		Uninvisible.captionTitle.style.display = 'block';
	}
	if(text && text.trim().length){
		Uninvisible.captionText.innerHTML = text;
		Uninvisible.captionText.style.display = 'block';
	}
}

export function clearCaption(){
	this.captionContainer.style.display = 'none';

	this.captionTitle.style.display = 'none';
	this.captionTitle.innerHTML = '';

	this.captionText.style.display = 'none';
	this.captionText.innerHTML = '';
}
