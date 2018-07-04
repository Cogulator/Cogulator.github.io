$(function() {
	let example = "* Here's an model of someone using Siri on their iphone as an example to get you started" + "\n" +
						  "** You can build models automagically using the magic models tool.To open it up, press the magic wand button to the right." + "\n" +
						  "** To see all the operators you can insert, select a blank line, and the click the purple insert (+) button that appears to the left of it.Clicking on an operator will insert it into the model.Click the green info button next to the operator for details." + "\n" +
						  "**  When you install Cogulator, several examples models are included to get you started." + "\n" +
						  "\n" +
						  "* If this is all completely confusing, check out the resources link at the top for some introductory videos, and the primer for more detailed information." + "\n" +
						  "\n" +
						  "Goal: Start Siri" + "\n" +
						  ".Look at <Home Button>" + "\n" +
						  ".Touch <Home Button>" + "\n" +
						  ".Click and hold <Home Button>" + "\n" +
						  ".Wait for speech rec to start (1 second)" + "\n" +
						  ".Ignore <Home Button>" + "\n" +
						  ".Hear <start sound> " + "\n" +
						  ".Ignore <start sound>" + "\n" +
						  "\n" +
						  "Goal: Request Weather" + "\n" +
						  ".Say  What's the weather today? (6 syllables) " + "\n" +
						  "\n" +
						  "Goal: Hear Weather" + "\n" +
						  ".Also Read Weather" + "\n" +
						  "..Look at <temp>" + "\n" +
						  "..Look at <rain>" + "\n" +
						  ".Wait for reply (1 second)" + "\n" +
						  ".Hear It's <97> and <sunny> today (9 syllables)";

	G.quill.setText(example);
});
