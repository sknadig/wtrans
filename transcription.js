document.addEventListener('DOMContentLoaded', function () {

	//Declaring variables:
	//1) Undo array to save steps.
	var undoArray = [];
	//2) Wave surfer object.
	var wavesurfer;
	//3) Speaker ID - Incremented.
	var sID = 0;
	//4) To compare the stored transcription with the newly entered one to detect change.
	var before = "";
	//5) JSON array of Speakers objects.
	var speakers = {
		"speakers": [
			{
				"name": "Speaker 0",
				"id": "0",
				"r": Math.floor(Math.random() * 256),
				"g": Math.floor(Math.random() * 256),
				"b": Math.floor(Math.random() * 256)
	}
]
	};
	//6) Random color for the unassigned regions.
	var defaultR = Math.floor(Math.random() * 256);
	var defaultG = Math.floor(Math.random() * 256);
	var defaultB = Math.floor(Math.random() * 256);
	//7) Keep track of the last chosen speaker to set it as the default one.
	var currentSpeaker = -1;
	//8) Fill the speakers panel with one pre created speaker.
	$('#speakers-panel').append('<div class="speaker-element"><p id = "' +
		speakers.speakers[0].id +
		'">' +
		speakers.speakers[0].name +
		' </p> <a class = "edit-speaker" id ="' +
		speakers.speakers[0].id +
		'_edit"><i id = "edit" class="fas fa-pen"></i>' +
		'<a class = "delete-speaker" id ="' +
		speakers.speakers[0].id +
		'_delete"><i id="delete" class="fas fa-times"></i></a></p></div>');

	//9) Initialize waveSurfer
	wavesurfer = WaveSurfer.create({
		container: '#waveform',
		height: 100,
		pixelRatio: 1,
		scrollParent: true,
		normalize: true,
		minimap: true,
		backend: 'MediaElement'
	});


	//10) load an Audio to the waveSurfer object
	wavesurfer.load('http://ia902606.us.archive.org/35/items/shortpoetry_047_librivox/song_cjrg_teasdale_64kb.mp3');


	//Event Listeners:
	// Setting up the wave 
	wavesurfer.on('ready', function () {

		// Timeline - plugin
		var timeline = Object.create(WaveSurfer.Timeline);

		timeline.init({
			wavesurfer: wavesurfer,
			container: '#waveform-timeline'
		});


		// Play button
		document
			.querySelector('[data-action="play"]')
			.addEventListener('click', wavesurfer.playPause.bind(wavesurfer));


		// Backward by 1 sec.
		$("#button-frwrd").click(function () {
			wavesurfer.skipForward(1);
		});


		// Forward by 1 sec.
		$("#button-bkwrd").click(function () {
			wavesurfer.skipBackward(1);
		});


		// Enable region selection
		wavesurfer.enableDragSelection({
			color: 'rgba(' + defaultR + ',' + defaultG + ',' + defaultB + ', 0.15)'
		});


		// Play region 
		wavesurfer.on('region-click', function (region, e) {
			e.stopPropagation();
			// Play on click, loop on shift click
			e.shiftKey ? region.playLoop() : region.play();

			$('#transcript').html(region.data);
			$("#" + region.id + "_row").css("background", "#e6e6e6");

			window.onkeyup = function (event) {
				keyboardShortcuts(event, region);
			};

		});

	});

	// Event Listener: upon clicking on a region, display its info	
	wavesurfer.on('region-click', displayRegionInfo);

	// Event Listener: upon draging a region, create it	
	wavesurfer.on('region-created', function (region, event) {

		// Add a bin icon on the region
		if (!region.hasDeleteButton) {
			var regionEl = region.element;
			var deleteButton = regionEl.appendChild(document.createElement('deleteButton'));
			deleteButton.className = 'fa fa-trash';

			// Event Listener: Upon clicking on the bin icon, remove the region along with its transcription.
			deleteButton.addEventListener('click', function (e) {
				undoArray.push(region);
				region.remove();
				console.log(region.id);
				$("#" + region.id + "_row").remove();
			});

			deleteButton.title = "Delete region";
			region.hasDeleteButton = true;
			region.speaker = currentSpeaker;
		}

		// Retrieve the region's transcription if there's any.
		var editableTranscript = "Type the transcript here";
		if (!jQuery.isEmptyObject(region.data)) {
			editableTranscript = region.data;
		}

		// Add table row to enable transcription
		$('.default-text').css("display", "none");
		$('#fullscript-table').append('<tr id="' + region.id + '_row"> <td class="speakers-dropdown"><select id="' + region.id + '_speakers"><option value="reset"  disabled selected>Choose a speaker ↓</option></select> </td> <td class="editable-td" id="' + region.id + '" contentEditable="true">' + editableTranscript + '</td> </tr>');

		// Fill the speakers dropdown list with the speakers.
		for (var key in speakers.speakers) {
			var speakerId = speakers.speakers[key].id;
			var speakerName = speakers.speakers[key].name;
			var speakerColor = 'rgba(' +
				speakers.speakers[key].r +
				',' +
				speakers.speakers[key].g +
				',' +
				speakers.speakers[key].b +
				',0.15)';

			$('#' + region.id + '_speakers').append('<option value="' + speakerId + '" data-color="' +
				speakerColor +
				'">' +
				speakerName +
				'</option>');
		}

		// Set the latest selected speaker as the default one.
		if (currentSpeaker != -1) {
			region.color = 'rgba(' +
				speakers.speakers[currentSpeaker].r +
				',' +
				speakers.speakers[currentSpeaker].g +
				',' +
				speakers.speakers[currentSpeaker].b +
				',0.15)';
			$('#' + region.id + '_speakers option[value="' + currentSpeaker + '"]').attr("selected", "selected");
		}

		// Event Listener: Keyboard shortcuts.
		window.onkeyup = function (event) {
			keyboardShortcuts(event, region);
		};

	});

	// Event Listener: when the cursor enters the region		
	wavesurfer.on('region-in', function (region, e) {

		// Retrieve and display region's attributes (speaker,color and data)
		displayRegionInfo(region);

		// Display subtitle above the wave
		$('#current-speaker').css("visibility", "visible");

		// Event Listener: keyboard shortcuts
		window.onkeyup = function (event) {
			keyboardShortcuts(event, region);
		};

	});

	// Event Listener: when the cursor leaves the region	
	wavesurfer.on('region-out', function (region) {

		$('#current-speaker').css("visibility", "hidden");
		$("#" + region.id + "_row").css("background", "#f8f8f8");

	});

	// Event Listener: upon changing the speaker of the region
	$('#fullscript-table').on('change', 'select', function () {

		//Change current speaker
		currentSpeaker = $(this).find('option:selected').val();

		// Update region's speaker and color  
		wavesurfer.regions.list[$(this).attr('id').substring(0, $(this).attr('id').lastIndexOf('_'))].speaker = $(this).find('option:selected').val();

		wavesurfer.regions.list[$(this).attr('id').substring(0, $(this).attr('id').lastIndexOf('_'))].update({
			color: $(this).find('option:selected').attr('data-color')
		});
		console.log(Object.values(wavesurfer.regions.list));
	});

	// Event Listener: upon writing in the transcription area 
	$('#fullscript-table').on('focus', '.editable-td', function () {
			before = $(this).html();
		})
		.on('blur keyup paste', '.editable-td', function () {
			if (before != $(this).html()) {
				wavesurfer.regions.list[$(this).attr('id')].update({
					data: $(this).html()
				});
			}

		});

	// Event Listener: General keyboard shortcuts
	window.onkeydown = function (e) {


		if (e.which == 90 && e.ctrlKey) {
			e.preventDefault();
			if (undoArray.length != 0) {
				wavesurfer.addRegion(undoArray.pop());
			}
		}


		if (e.metaKey && e.key === 'z') {
			e.preventDefault();
			if (undoArray.length != 0) {
				wavesurfer.addRegion(undoArray.pop());
			}
		} else if (e.which == 72 && e.shiftKey) { //ctr+h for next segment
			var currentPosition = wavesurfer.getCurrentTime();

			for (var key in wavesurfer.regions.list) {
				if (wavesurfer.regions.list[key].start > currentPosition) {
					//alert(wavesurfer.regions.list[key].start );
					wavesurfer.play(wavesurfer.regions.list[key].start);
					break;
				}

			}


		} else if (e.which == 66 && e.shiftKey) { // ctr+b for previous segment 
			var currentPosition = wavesurfer.getCurrentTime();


			var regionsCopy = [];
			var i = 0;

			for (var key in wavesurfer.regions.list) {

				regionsCopy[i] = wavesurfer.regions.list[key];
				if (wavesurfer.regions.list[key].end >= currentPosition) {
					break;
				}
				i++;
			}
			if (i >= 1)
				wavesurfer.play(regionsCopy[i - 1].start);

		} else if (e.which == 39 && !($('.editable-td').is(":focus")) && !($('input').is(":focus"))) {
			// Forward by 1 sec.
			wavesurfer.skipForward(1);
		} else if (e.which == 37 && !($('.editable-td').is(":focus")) && !($('input').is(":focus"))) {
			// Backward by 1 sec.
			wavesurfer.skipBackward(1);
		} else if (e.which == 32 && !($('.editable-td').is(":focus")) && !($('input').is(":focus"))) {
			wavesurfer.playPause();
		}

	};

	// Event Listener: Alert help message
	$('#help').click(function () {
		swal("Select a range of seconds to segment and transcript.");

	});

	// Event Listener: to edit speaker's name upon clicking on the pen
	$('#speakers-panel').on('click', '.edit-speaker', function () {

		swal("Enter speaker's name:", {
				content: "input",
			})
			.then((value) => {

				var speakerId = $(this).attr('id').substring(0, $(this).attr('id').indexOf('_'));

				var elementId = $(this).attr('id');
				console.log(elementId);

				for (var key in speakers.speakers) {

					if (speakers.speakers[key].id == speakerId) {
						speakers.speakers[key].name = value;
						$('#' + elementId + '').parent().children(':first').html(value);

					}

				}
				$('select option[value="' + speakerId + '"]').html(value);


			});
	});

	// Event Listener: to delete the speaker
	$('#speakers-panel').on('click', '.delete-speaker', function () {
		var elementId = $(this).attr('id');
		var speakerId = $(this).attr('id').substring(0, $(this).attr('id').indexOf('_'));

		$('#' + elementId + '').parent().remove();
		for (var key in speakers.speakers) {

			if (speakers.speakers[key].id == speakerId) {
				speakers.speakers.splice(key);
			}
			console.log(Object.values(speakers.speakers));
		}
		$('select option[value="' + speakerId + '"]').remove();

	});


	// Event Listener: to add a new speaker.
	$('#plus').click(function () {
		'use strict';

		var id = generateID();
		speakers.speakers[id] = ({
			"name": "Speaker " + id,
			"id": id,
			"r": Math.floor(Math.random() * 256),
			"g": Math.floor(Math.random() * 256),
			"b": Math.floor(Math.random() * 256)
		});

		var speakerId = speakers.speakers[id].id;
		var speakerName = speakers.speakers[id].name;
		var speakerColor = 'rgba(' +
			speakers.speakers[id].r +
			',' +
			speakers.speakers[id].g +
			',' +
			speakers.speakers[id].b +
			',0.15)';

		$('#speakers-panel').append('<div class="speaker-element"><p id = "' +
			speakerId +
			'">' +
			speakerName +
			' </p> <a class = "edit-speaker" id ="' +
			speakerId +
			'_edit"><i id = "edit"class="fas fa-pen"></i>' +
			'<a class = "delete-speaker" id ="' +
			speakerId +
			'_delete"><i id="delete" class="fas fa-times"></i></a></p></div>');


		$('select').append('<option value="' + speakerId + '" data-color="' +
			speakerColor +
			'">' +
			speakerName +
			'</option>');
	});

	// Function: Retrieve and display region's attributes (speaker,color and data)
	function displayRegionInfo(region) {

		var textColor = region.color.substring(0, region.color.length - 4);
		textColor = textColor + "1)";

		$('#transcript-field').val("");
		$('#sub-speaker').html("");
		$('#sub-transcript').html("");
		if (!jQuery.isEmptyObject(region.data)) {
			$('#transcript-field').val(region.data);
			if (region.speaker == -1)
				$('#sub-speaker').html("Unassigned speaker: ");
			else
				$('#sub-speaker').html("" + speakers.speakers[region.speaker].name + ": ");
			$('#sub-speaker').css({
				"padding-left": "15",
				"padding-right": "15",
				"background": region.color,
				"color": textColor,
				"border-radius": "20px",
				"width": "auto",
				"font-weight": "bold",
				"line-height": "35px",
				"height": "35px"
			});
			$('#sub-transcript').html(region.data);
			$('#current-speaker').css("visibility", "visible");
		}
		$('#seg-duration').html("This segment starts at <b>" + region.start.toFixed(2) + " </b> ends at <b>" + region.end.toFixed(2) + "</b>");

	}

	// Function: to increment speakers ID (sID)
	function generateID() {
		sID += 1;
		return sID;
	}

	// Function: Keyboard shortcuts that controls to region
	function keyboardShortcuts(e, region) {


		if (e.which == 8 && !($('.editable-td').is(":focus")) && !($('input').is(":focus"))) {
			undoArray.push(region);
			region.remove();
			$("#" + region.id + "_row").remove();
		}



	}



	// Temporarily removed pieces of code	

	/*
	*
	*function EDIg button for editing speaker's information (this function onnly edits speaker's ID)
	*
	   document.getElementById('EDIg').addEventListener('click', function () {
	       var isChecked = $('input[type="radio"]').is(':checked');

	       if (!isChecked) {
	           swal("Select a speaker to be edited");
	           return;

	       }

	       swal("Write something here:", {
	               content: "input",
	           })
	           .then((value) => {
	               var checkedId = $("input[type='radio']:checked").attr("id");
	               $("label[for='" + checkedId + "']").html(value);


	           });

	   });

	*/


	/*
	*
	*Function for VOS button to hilight all the segments for the chosen speaker.

	   document.getElementById('VOS').onclick = function () {

	       var checkedId = $("input[type='radio']:checked").attr("id");
	       var table = document.getElementById('fullscript-table');
	       for (var i = 0, row; row = table.rows[i]; i++) {

	           if (row.cells[0].firstChild.getAttribute("data-id") == checkedId) {
	               row.cells[1].className = "selected"

	           }
	       }

	   };

	*/




});