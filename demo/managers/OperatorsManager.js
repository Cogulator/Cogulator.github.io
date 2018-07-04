class OperatorsManager {
	
	constructor() {
		this.operators = [];
		let operatorText = this.loadOperators();
		this.setOperators(operatorText);
	}
	
	
	loadOperators() {
		let text = "see Look 550 NGOMSL/CPM._Look_at_an_item_at_a_known_position." + "\n" +
			"see Perceptual_processor 100 Used_in_low_level_MHP_models._Represents_one_cycle_of_the_perceptual_processor." + "\n" +
			"see Proofread 330 Time_to_carefully_read_a_single_word._Label_word_count_is_used_to_calculate_total_time. count_label_words" + "\n" +
			"see Read 260 Time_to_read_a_single_word._Label_word_count_is_used_to_calculate_total_time. count_label_words" + "\n" +
			"see Search 1250 Search_for_an_item_at_an_unknown_position." + "\n" +
			"see Saccade 30 Used_with_CPM-GOMS._A_single_rapid_eye_movement." + "\n" +
			"hear Hear 400 Listen_to_someone_speaking._Label_should_be_the_text_of_the_speech." + "\n" +
			"cognitive Attend 50 Used_with_CPM-GOMS._Shifting_of_attention_to_stimuli." + "\n" +
			"cognitive Cognitive_processor 70 Used_in_low_level_MHP_models._Represents_one_cycle_of_the_cognitive_processor." + "\n" +
			"cognitive Initiate 50 Used_with_CPM-GOMS._Initiate_motor_process." + "\n" +
			"cognitive Ignore 50 Removes_item_from_working_memory." + "\n" +
			"cognitive Mental 1250 Generic_operator_for_thinking." + "\n" +
			"cognitive Recall 550 Retrieve_information_from_LTM_or_WM." + "\n" +
			"cognitive Store 50 Place_item_in_working_memory." + "\n" +
			"cognitive Think 1250 Generic_operator_for_thinking." + "\n" +
			"cognitive Verify 1250 Generic_operator_for_thinking." + "\n" +
			"hands Click 320 Press_of_a_mouse_button." + "\n" +
			"hands Drag 230 Drag_item_across_screen._Associated_with_touchscreen_devices." + "\n" +
			"hands Grasp 750 Act_of_reaching_with_the_hand_and_grasping_an_object." + "\n" +
			"hands Hands 450 Move_hands_to_position_(typically_mouse_or_keyboard)." + "\n" +
			"hands Keystroke 280 Press_a_single_keyboard_key_(e.g.,_Enter_or_Esc)." + "\n" +
			"hands Motor_processor 70 Used_in_low_level_MHP_models._Represents_one_cycle_of_the_motor_processor." + "\n" +
			"hands Point 950 Move_cursor_via_the_mouse._Can_be_used_for_dragging." + "\n" +
			"hands Swipe 170 One_swipe_gesture._Should_usually_be_preceeded_by_Touch._Associated_with_touchscreen_devices." + "\n" +
			"hands Tap 450 Touch_a_series_of_virtual_buttons._Should_include_label_if_touchscreen_typing._Associated_with_touchscreen_devices." + "\n" +
			"hands Touch 490 Press_a_virtual_button._Associated_with_touchscreen_devices." + "\n" +
			"hands Turn 800 One_turn_of_a_knob_or_dial." + "\n" +
			"hands Type 280 Press_a_series_of_keyboard_keys._Should_include_label_with_the_typed_text." + "\n" +
			"hands Write 2000 Time_to_write_a_single_word._Label_Word_count_is_used_to_calculate_total_time. count_label_words" + "\n" +
			"speech Say 400 Speech._Label_should_be_the_text_of_the_speech." + "\n" +
			"system Wait 1000 User_waiting_for_system._Modify_time_by_adding_'(x_seconds)'_at_end_of_line."
		return text;
	}
	
	
	createOperator(name, resource, time, description) {
		var name = name.charAt(0).toUpperCase() + name.substr(1).toLowerCase();
		let line = "\n" + resource.trim() + " " + name.trim() + " " + time.trim() + " " + this.replaceAll(description, " ", "_") + "\n";
		G.io.appendToFile(G.paths.operatorsFile, line, this.onOperatorCreated);
	} onOperatorCreated() {
		let operatorText = G.operatorsManager.loadOperators();
		G.operatorsManager.setOperators(operatorText);
		$( document ).trigger( "New_Operator" ); // tells solarize & gomsprocessor to do their things
		$( document ).trigger( "Model_Loaded" ); // tells solarize & gomsprocessor to do their things
	}
	
	
	setOperators(operatorText) {
		let lines = operatorText.split('\n');
		
		for (var i = 0; i < lines.length; i++) {
			let cmpnts = lines[i].split(" ");
			if (cmpnts.length >= 3) {
				let time = parseInt(cmpnts[2]);
				if (this.isResource(cmpnts[0]) && !isNaN(time)) {
					var operator = new Operator(cmpnts[0], cmpnts[1], time);
					if (cmpnts.length >= 4) operator.description = cmpnts[3];
					if (cmpnts.length >= 5) operator.timeModifier = cmpnts[4];
					this.operators.push(operator);
				}
			}
		}
	}
	
	
	isResource(resource) {
		if (resource == 'see') return true;
		if (resource == 'hear') return true;
		if (resource == 'cognitive') return true;
		if (resource == 'hands') return true;
		if (resource == 'speech') return true;
		if (resource == 'system') return true;
		
		return false; 
	}
	
	replaceAll (text, search, replacement) {
    	return text.replace(new RegExp(search, 'g'), replacement);
	}
	
}

G.operatorsManager = new OperatorsManager();