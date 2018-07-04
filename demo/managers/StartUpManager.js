class StartUpManager {

	load() {
		console.log("START UP");
		this.index = 0;
		this.js = ["./objects/Components.js", 
					"./objects/Operator.js",
					"./objects/Step.js",
					"./objects/Chunk.js",
				    "./objects/Point.js",
					"./utilities/StringUtils.js",
					"./interface/QuillEditor.js",
					"./managers/CustomEventsManager.js",
					"./managers/QuillManager.js",
					"./managers/QutterManager.js",
					"./managers/AnnotationManager.js",
					"./objects/TimeObject.js",
					"./cognition/LineParser.js",
					"./managers/ErrorManager.js",
				    "./managers/TipManager.js",
					"./cognition/GomsProcessor.js",
					"./cognition/Memory.js",
					"./cognition/SubjectiveWorkload.js",
				    "./cognition/FittsLaw.js",
					"./managers/OperatorsManager.js",
					"./managers/MethodsManager.js",
					"./managers/SolarizeManager.js",
					"./managers/AutocompleteManager.js",
					"./managers/StatsDisplayManager.js",
					"./interface/GanttChart.js",
					"./interface/PopOver.js",
				    "./interface/PopOverFix.js",
				    "./managers/ReloadManager.js",
				  	"./interface/InsertionCHI.js",
				    "./interface/MagicModels.js"];
		
		$.getScript( this.js[this.index], function(){
			G.startUp.getNext();
		});
	}
	
	
	getNext() {
		G.startUp.index++;
		
		if (G.startUp.index < G.startUp.js.length) {
			$.getScript( this.js[this.index], function(){
				G.startUp.getNext();
			});
		} else {
			G.modelsManager.loadLastModel();
		}
	}
}


G.startUp = new StartUpManager();
G.startUp.load();

