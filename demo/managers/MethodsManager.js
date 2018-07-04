class MethodsManager {
	constructor() {
		this.update();
		this.stepsToWrite = "";
	}
	
	
	update() {
		this.methods = this.getMethods();
	}
	
	
	getMethods() {
		let methodsArr = [];
		
		for (var i = 0; i < this.paths.length; i++) {
			let methods = this.paths[i];
			for (var j = 0; j < methods.files.length; j++) {
				methodsArr.push(methods.files[j]);
			}
		}
		return methodsArr;
	}
	
	
}

G.methodsManager = new MethodsManager();