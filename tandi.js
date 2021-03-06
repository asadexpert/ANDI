//=========================================//
//tANDI: tables ANDI					   //
//Created By Social Security Administration//
//=========================================//

function init_module(){

var tandiVersionNumber = "9.1.0";

//create tANDI instance
var tANDI = new AndiModule(tandiVersionNumber,"t");

//a scope at this depth level triggers an alert
tANDI.scopeLevelLimit = 4;

//Delimeter for the the header cells
tANDI.associatedHeaderCellsDelimeter = " <span aria-hidden='true'>|</span> ";

//This function updates the Active Element Inspector when mouseover is on a given to a highlighted element.
//Holding the shift key will prevent inspection from changing.
AndiModule.andiElementHoverability = function(event){
	//When hovering, inspect the cells of the data table, not the table itself. Unless it's a presentation table
	if(!event.shiftKey && (!$(this).is("table,[role=table],[role=grid]") || $(this).is("table:not([role=presentation],[role=none])" )))
		tANDI.inspect(this);
};
//This function updates the Active Element Inspector when focus is given to a highlighted element.
AndiModule.andiElementFocusability = function(){
	andiLaser.eraseLaser();
	tANDI.inspect(this);
	andiResetter.resizeHeights();
};

var modeOverride = false;

//Override Previous Element Button to jump to and analyze the previous table:
$("#ANDI508-button-prevElement").off("click").click(function(){
	var index = parseInt($("#ANDI508-testPage .ANDI508-element-active").attr("data-ANDI508-index"));
	if(isNaN(index)){ //no active element yet
		activeTableIndex = 0;
		andiFocuser.focusByIndex(testPageData.andiElementIndex); //first element
	}
	else if(index == 1){
		if(tableCountTotal <= 1)
			//If there is only 1 table, loop back to last cell
			andiFocuser.focusByIndex(testPageData.andiElementIndex);
		else{
			//Analyze previous table
			$("#ANDI508-prevTable-button").click();
			//Focus on last cell
			andiFocuser.focusByIndex(testPageData.andiElementIndex);
		}
	}
	else
		//Go to previous element in this table
		andiFocuser.focusByIndex(index - 1);
});

//Override Next Element Button to jump to and analyze the next table:
$("#ANDI508-button-nextElement").off("click").click(function(){
	var index = parseInt($("#ANDI508-testPage .ANDI508-element-active").attr("data-ANDI508-index"));
	if(index == testPageData.andiElementIndex || isNaN(index)){
		if(tableCountTotal <= 1)
			//If there is only 1 table, loop back to first cell
			andiFocuser.focusByIndex(1);
		else
			//Analyze previous table
			$("#ANDI508-nextTable-button").click();
	}
	else
		//Go to next element in this table
		andiFocuser.focusByIndex(index + 1);
});

//These variables are for the page
var tableCountTotal = 0;			//The total number of tables
var presentationTablesCount = 0;	//The total number of presentation tables
var dataTablesCount = 0;			//The total number of data tables (tables that aren't presentation tables)
var tableArray = [];				//Stores all tables in an array
var activeTableIndex = -1;			//The array index of the active table

//These variables are for the current table being analyzed (the active table)
var cellCount = 0;					//The total number of <th> and <td>
var rowCount = 0;					//The total number of <tr>
var colCount = 0;					//The total number of columns (maximum number of <th> or <td> in a <tr>)
var activeTableType;				//The table type (data or presentation) of the active table

//AndiModule.activeActionButtons
if($.isEmptyObject(AndiModule.activeActionButtons)){
	$.extend(AndiModule.activeActionButtons,{scopeMode:true}); //default, false == headersIdMode
	$.extend(AndiModule.activeActionButtons,{markup:false});
	$.extend(AndiModule.activeActionButtons,{tableListVisible:false});
	$.extend(AndiModule.activeActionButtons,{modeButtonsVisible:false});
}

//This function will analyze the test page for table related markup relating to accessibility
tANDI.analyze = function(){
	if(TestPageData.page_using_table){
		//Loop through each visible table
		var activeElementFound = false;
		$(TestPageData.allVisibleElements).filter("table,[role=table],[role=grid]").each(function(){
			//Store this table in the array
			tableArray.push($(this));
			
			//Is this not a presentation table?
			if(!$(this).is("[role=presentation],[role=none]")){
				//It's a data table
				dataTablesCount++;
			}
			else//It's a presentation table
				presentationTablesCount++;
				
			//Determine if this is a refresh of tANDI (there is an active element)
			if(!activeElementFound &&
				($(this).hasClass("ANDI508-element-active") || $(this).find("th.ANDI508-element-active,td.ANDI508-element-active").first().length ))
			{
				activeTableIndex = tableCountTotal;//set this index to this table
				activeElementFound = true;
			}
			
			tableCountTotal++;
		});

		//If the page has tables
		if(tableCountTotal > 0){

			var moduleActionButtons = "";
			
			//Scope Mode / Headers/ID Mode buttons
			moduleActionButtons += "<button id='ANDI508-scopeMode-button' aria-pressed='";
			moduleActionButtons += (AndiModule.activeActionButtons.scopeMode)? "true' class='ANDI508-module-action-active'" : "false'";
			moduleActionButtons += ">scope mode</button><button id='ANDI508-headersIdMode-button' aria-pressed='";
			moduleActionButtons += (!AndiModule.activeActionButtons.scopeMode)? "true' class='ANDI508-module-action-active'" : "false'";
			moduleActionButtons += ">headers/id mode</button>";

			//Markup Overlay Button
			moduleActionButtons += "<span class='ANDI508-module-actions-spacer'>|</span> <button id='ANDI508-markup-button' aria-label='Markup Overlay' aria-pressed='false'>markup"+overlayIcon+"</button>";
			
			$("#ANDI508-module-actions").html(moduleActionButtons);
			
			if(activeElementFound)
				analyzeTable(tableArray[activeTableIndex]);
			else//Analyze first table
				analyzeTable(tableArray[0]);
			
			//If there are more than one table
			if(tableCountTotal > 1){
				//Add "prev table" and "next table" buttons
				$("#ANDI508-elementControls").append(
					"<button id='ANDI508-prevTable-button' aria-label='Previous Table' title='Analyze Previous Table'><img src='"+icons_url+"prev-table.png' alt='' /></button> "+
					"<button id='ANDI508-nextTable-button' aria-label='Next Table' title='Analyze Next Table'><img src='"+icons_url+"next-table.png' alt='' /></button>"
				);
			}

			//Define scopeMode button functionality
			$("#ANDI508-scopeMode-button").click(function(){
				andiResetter.softReset($("#ANDI508-testPage"));
				AndiModule.activeActionButtons.scopeMode = true;
				AndiModule.activeActionButtons.modeButtonsVisible = true;
				AndiModule.launchModule("t");
				andiResetter.resizeHeights();
				return false;
			});
			
			//Define headersIdMode button functionality
			$("#ANDI508-headersIdMode-button").click(function(){
				andiResetter.softReset($("#ANDI508-testPage"));
				AndiModule.activeActionButtons.scopeMode = false;
				AndiModule.activeActionButtons.modeButtonsVisible = true;
				AndiModule.launchModule("t");
				andiResetter.resizeHeights();
				return false;
			});
			
			//Define markup button functionality
			$("#ANDI508-markup-button").click(function(){
				if($(this).attr("aria-pressed")=="false"){
					andiOverlay.overlayButton_on("overlay",$(this));
					andiOverlay.overlayTableMarkup();
					AndiModule.activeActionButtons.markup = true;
				}
				else{
					andiOverlay.overlayButton_off("overlay",$(this));
					andiOverlay.removeOverlay("ANDI508-overlay-tableMarkup");
					AndiModule.activeActionButtons.markup = false;
				}
				andiResetter.resizeHeights();
				return false;
			});
			
			//Define prevTable button functionality
			$("#ANDI508-prevTable-button")
			.click(function(){
				if(activeTableIndex < 0)
					//focus on first table
					activeTableIndex = 0;
				else if(activeTableIndex === 0)
					activeTableIndex = tableArray.length-1;
				else 
					activeTableIndex--;
				tANDI.reset();
				analyzeTable(tableArray[activeTableIndex]);
				tANDI.results();
				andiFocuser.focusByIndex(1);
				tANDI.redoMarkup();
				tANDI.viewList_highlightSelectedTable(activeTableIndex, true);
				andiResetter.resizeHeights();
				return false;
			})
			.mousedown(function(){
				$(this).addClass("ANDI508-module-action-active");
			})
			.mouseup(function(){
				$(this).removeClass("ANDI508-module-action-active");
			});
			
			//Define nextTable button functionality
			$("#ANDI508-nextTable-button")
			.click(function(){
				if(activeTableIndex == tableArray.length-1)
					activeTableIndex = 0;
				else
					activeTableIndex++;
				
				tANDI.reset();
				analyzeTable(tableArray[activeTableIndex]);
				tANDI.results();
				andiFocuser.focusByIndex(1);
				tANDI.redoMarkup();
				tANDI.viewList_highlightSelectedTable(activeTableIndex, true);
				andiResetter.resizeHeights();
				return false;
			})
			.mousedown(function(){
				$(this).addClass("ANDI508-module-action-active");
			})
			.mouseup(function(){
				$(this).removeClass("ANDI508-module-action-active");
			});
		}
	}
};

//This function updates the results in the ANDI Bar
tANDI.results = function(){
	
	//Update Results Summary text depending on the active table type (data or presentation)
	andiBar.updateResultsSummary("Tables: "+tableCountTotal+" (data tables: "+dataTablesCount+", presentation tables: "+presentationTablesCount+")");
	
	if(tableCountTotal > 0){
		if(!tANDI.viewList_buttonAppended){
			$("#ANDI508-additionalPageResults").append("<button id='ANDI508-viewTableList-button' class='ANDI508-viewOtherResults-button' aria-expanded='false'>"+listIcon+"view table list</button>");

			//viewTableList Button
			$("#ANDI508-viewTableList-button").click(function(){
				if(!tANDI.viewList_tableReady){
					tANDI.viewList_buildTable();
					tANDI.viewList_attachEvents();
					tANDI.viewList_tableReady = true;
				}
				tANDI.viewList_toggle(this);
				andiResetter.resizeHeights();
				return false;
			});
			
			tANDI.viewList_buttonAppended = true;
		}
	}
	
	if(dataTablesCount > 0){
		andiBar.showElementControls();
		if(!andiBar.focusIsOnInspectableElement()){
			andiBar.showStartUpSummary("Discover accessibility markup for <span class='ANDI508-module-name-t'>tables</span> by tabbing to or hovering over the table cells.",true,"table cell");
			if(dataTablesCount + presentationTablesCount > 1)
				$("#ANDI508-startUpSummary").append("<p>Tables should be tested one at a time - Press the next table button <img src='"+icons_url+"next-table.png' style='width:12px' alt='' /> to cycle through the tables.</p>");
		}
		else
			$("#ANDI508-pageAnalysis").show();
	}
	else if(presentationTablesCount > 0){
		andiBar.showElementControls();
		if(!andiBar.focusIsOnInspectableElement())
			andiBar.showStartUpSummary("Only presentation <span class='ANDI508-module-name-t'>tables</span> were found on this page, no data tables.",true);
		else
			$("#ANDI508-pageAnalysis").show();
	}
	else{
		//No Tables Found
		andiBar.hideElementControls();
		andiBar.showStartUpSummary("No <span class='ANDI508-module-name-t'>tables</span> were found on this page.",false);
	}
	andiAlerter.updateAlertList();
	if(!AndiModule.activeActionButtons.tableListVisible && testPageData.numberOfAccessibilityAlertsFound > 0)
		$("#ANDI508-alerts-list").show();
	else
		$("#ANDI508-alerts-list").hide();
};

//This function will inspect a table or table cell
tANDI.inspect = function(element){
	andiBar.prepareActiveElementInspection(element);
	
	//Remove other tANDI highlights
	$("#ANDI508-testPage .tANDI508-highlight").removeClass("tANDI508-highlight");
	//Highlight This Element
	$(element).addClass("tANDI508-highlight");
	
	var associatedHeaderCellsText = "";
	
	if(!$(element).is("table,[role=table],[role=grid]"))
		grabHeadersAndHighlightRelatedCells(element);
	
	var elementData = $(element).data("ANDI508");
	
	andiBar.displayOutput(elementData);
	
	//insert the associatedHeaderCellsText into the output if there are no danger alerts
	if(elementData.dangers.length === 0){
		var outputText = $("#ANDI508-outputText");
		$(outputText).html(associatedHeaderCellsText + " " + $(outputText).html());
	}
	
	//Create array of additional components needed by this module
	var additionalComponents = [
		associatedHeaderCellsText,
		element.id,
		$(element).attr("colspan"),
		$(element).attr("rowspan"),
		$(element).attr("aria-colcount"),
		$(element).attr("aria-rowcount"),
		$(element).attr("aria-colindex"),
		$(element).attr("aria-rowindex"),
		$(element).attr("aria-colspan"),
		$(element).attr("aria-rowspan")
	];
	
	//This function propagates the Accessible Components table.
	//Only shows components containing data.
	//Will display message if no accessible components were found.
	andiBar.displayTable(elementData,
		[
			["caption",elementData.caption],
			["aria-labelledby",	elementData.ariaLabelledby],
			["aria-label", elementData.ariaLabel],
			["alt", elementData.alt],
			["innerText", elementData.innerText],
			["child", elementData.subtree],
			["imageSrc", elementData.imageSrc],
			["aria-describedby", elementData.ariaDescribedby],
			["summary", elementData.summary],
			["title", elementData.title],
			["header&nbsp;cells", additionalComponents[0]]
		],
		[
			["scope", elementData.scope],
			["headers", elementData.headers],
			["id", additionalComponents[1]],
			["colspan", additionalComponents[2]],
			["rowspan", additionalComponents[3]],
			["aria-colcount", additionalComponents[4]],
			["aria-rowcount", additionalComponents[5]],
			["aria-colindex", additionalComponents[6]],
			["aria-rowindex", additionalComponents[7]],
			["aria-colspan", additionalComponents[8]],
			["aria-rowspan", additionalComponents[9]],
			["aria-sort", elementData.addOnProperties.ariaSort],
			["aria-controls", elementData.addOnProperties.ariaControls],
			["aria-haspopup", elementData.addOnProperties.ariaHaspopup],
			["tabindex", elementData.addOnProperties.tabindex]
		],
		additionalComponents
	);
	
	//This function will grab associated header cells and add highlights
	function grabHeadersAndHighlightRelatedCells(element){
		var table = $(element).closest("table,[role=table],[role=grid]");
		var rowIndex = $(element).attr("data-tANDI508-rowIndex");
		var colIndex = $(element).attr("data-tANDI508-colIndex");
		var colgroupIndex = $(element).attr("data-tANDI508-colgroupIndex");
		var rowgroupIndex = $(element).attr("data-tANDI508-rowgroupIndex");

		//Find Related <th> cells
		//==HEADERS/ID MODE==//
		if(!AndiModule.activeActionButtons.scopeMode){
			//if the inspected element has headers attribute
			var headers = $.trim($(element).attr("headers"));
			var idsArray;
			if(headers){
				idsArray = headers.split(" ");
				var referencedElement;
				for (var x=0; x<idsArray.length; x++){
					//Can the id be found somewhere on the page?
					referencedElement = document.getElementById(idsArray[x]);
					
					if($(referencedElement).html() !== undefined){
						if($(referencedElement).is("th") || $(referencedElement).is("td")){
							addHighlight(referencedElement, true);
						}
					}
				}
			}
			//if the inspected element is a th, find the id references
			if($(element).is("th")){
				var id = $(element).attr("id");
				if(id){
					$(table).find("th.ANDI508-element:not(.tANDI508-highlight),td.ANDI508-element:not(.tANDI508-highlight)").filter(":visible").each(function(){
						headers = $(this).attr("headers");
						if(headers){
							idsArray = headers.split(" ");
							for (var x=0; x<idsArray.length; x++){
								if(id == idsArray[x])
									addHighlight(this);
							}
						}
					});
				}
			}
		}
		//==SCOPE MODE==//
		else if(AndiModule.activeActionButtons.scopeMode){
			
			//Create vars for the looping that's about to happen
			var s, ci, ri;
			
			//if inspected element is a td
			if($(element).is("td")){
				//Highlight associating <th> for this <td>
				$(table).find("th.ANDI508-element").filter(":visible").each(function(){
					s = $(this).attr("scope");
					ci = $(this).attr("data-tANDI508-colIndex");
					ri = $(this).attr("data-tANDI508-rowIndex");
					
					//get associated th from col
					if(s != "row" && s != "rowgroup" &&
						(!colgroupIndex || (colgroupIndex == $(this).attr("data-tANDI508-colgroupIndex"))) &&
						index_match(colIndex, ci) && !index_match(rowIndex, ri) )
					{
						addHighlight(this, true);
					}
					//get associated th from row
					else if(s != "col" && s != "colgroup" &&
						(!rowgroupIndex || (rowgroupIndex == $(this).attr("data-tANDI508-rowgroupIndex"))) &&
						index_match(rowIndex, ri) && !index_match(colIndex, ci) )
					{
						addHighlight(this, true);
					}
				});
			}
			//if inspected element is a th
			else if($(element).is("th")){
				//Highlight associating <th> and <td> for this <th>
				var scope = $(element).attr("scope");
				var row_index_matches, col_index_matches;
				var cgi, rgi;
				$(table).find("th.ANDI508-element,td.ANDI508-element").filter(":visible").each(function(){
					s = $(this).attr("scope");
					ci = $(this).attr("data-tANDI508-colIndex");
					ri = $(this).attr("data-tANDI508-rowIndex");
					cgi = $(this).attr("data-tANDI508-colgroupIndex");
					rgi = $(this).attr("data-tANDI508-rowgroupIndex");
					row_index_matches = index_match(rowIndex, ri);
					col_index_matches = index_match(colIndex, ci);
					
					if($(this).is("th") && s){
						//get associated th from col
						if(col_index_matches && !row_index_matches){
							if(s == "col" ||
							(s == "colgroup" && (!colgroupIndex || (colgroupIndex == cgi))))
							{
								addHighlight(this, true);
							}
						}
						//get associated th from row
						else if(row_index_matches && !col_index_matches){
							if(s == "row" ||
								(s == "rowgroup" && (!rowgroupIndex || (rowgroupIndex == rgi))))
							{
								addHighlight(this, true);
							}
						}
					}
					
					if(scope){
						//th has scope
						if(scope == "col" && col_index_matches){
							addHighlight(this);
						}
						else if(scope == "row" && row_index_matches){
							addHighlight(this);
						}
						else if(scope == "colgroup" && col_index_matches){
							if($(element).parent().attr("data-tANDI508-colgroupSegment")){
								if(colgroupIndex == cgi)
									addHighlight(this);
							}
							else
								addHighlight(this);
						}
						else if(scope == "rowgroup" && row_index_matches && rowgroupIndex == rgi)
							addHighlight(this);
					}
					else{
						//th has no scope
						//**Assumed associations - this is where it gets sketchy**
						if($(this).is("td")){
							if(col_index_matches || row_index_matches)
								addHighlight(this);
						}
						//No scope assumptions relating to other th
						else if($(this).is("th")){
							if(rowIndex == "0" && col_index_matches)
								addHighlight(this);
						}
					}
					
				});
			}
			else if(
				( $(element).is("[role=cell]") && $(table).attr("role") == "table" ) || 
				( $(element).is("[role=gridcell]") && $(table).attr("role") == "grid" )
			){
				$(table).find("[role=columnheader].ANDI508-element,[role=rowheader].ANDI508-element").filter(":visible").each(function(){
					ci = $(this).attr("data-tANDI508-colIndex");
					ri = $(this).attr("data-tANDI508-rowIndex");
					//alert(colIndex+" "+rowIndex+" |"+ci+ri)
					//Highlight associating columnheader for this cell
					if(index_match(colIndex, ci) && !index_match(rowIndex, ri) )
					{
						addHighlight(this, true);
					}
					//Highlight associating rowheader for this cell
					if(index_match(rowIndex, ri) && !index_match(colIndex, ci) )
					{
						addHighlight(this, true);
					}
				});
			}
			else if($(element).is("[role=columnheader],[role=rowheader]")){
				var row_index_matches, col_index_matches;
				var s = ($(element).is("[role=columnheader]")) ? "col" : "row";
				$(table).find(".ANDI508-element").filter(":visible").each(function(){
					ci = $(this).attr("data-tANDI508-colIndex");
					ri = $(this).attr("data-tANDI508-rowIndex");
					row_index_matches = index_match(rowIndex, ri);
					col_index_matches = index_match(colIndex, ci);
					
					if($(this).is("[role=columnheader]")){
						//get associated th from columnheaders in this col
						if(col_index_matches && !row_index_matches){
							addHighlight(this, true);
						}
					}
					else if($(this).is("[role=rowheader]")){
						//get associated th from rowheaders in this row
						if(row_index_matches && !col_index_matches){
							addHighlight(this, true);
						}
					}
					
					if(s === "col"){
						//highlight cells in this col
						if(col_index_matches){
							addHighlight(this);
						}
					}
					else{ // s === "row"
						//highlight cells in this row
						if(row_index_matches){
							addHighlight(this);
						}
					}
					
				});
			}
		}
		
		//This functoin will add the highlight to the element
		//if updateAssociatedHeaderCellsText is true it will add the text to the header cells
		function addHighlight(element, updateAssociatedHeaderCellsText){
			$(element).addClass("tANDI508-highlight");
			if(updateAssociatedHeaderCellsText)
				associatedHeaderCellsText += andiUtility.formatForHtml(andiUtility.getTextOfTree($(element))) + tANDI.associatedHeaderCellsDelimeter;
		}
	}
};

//This function will remove tANDI markup from every table and rebuild the alert list
tANDI.reset = function(){
	var testPage = $("#ANDI508-testPage");
	
	//Every ANDI508-element
	$(testPage).find(".ANDI508-element").each(function(){
		$(this)
			.removeClass("tANDI508-highlight")
			.removeAttr("data-ANDI508-index data-tANDI508-rowIndex data-tANDI508-colIndex data-tANDI508-colgroupIndex data-tANDI508-rowgroupIndex")
			.removeClass("ANDI508-element ANDI508-element-danger ANDI508-highlight")
			.removeData("ANDI508")
			.off("focus",AndiModule.andiElementFocusability)
			.off("mouseenter",AndiModule.andiElementHoverability);
	});
	
	$("#ANDI508-alerts-list").html("");
	
	testPageData = new TestPageData(); //get fresh test page data
};

//This function hides the scopeMode headersIdMode buttons
tANDI.hideModeButtons = function(){
	AndiModule.activeActionButtons.modeButtonsVisible = false;
	$("#ANDI508-scopeMode-button").add("#ANDI508-headersIdMode-button").add($("#ANDI508-markup-button").prev())
		.addClass("ANDI508-module-action-hidden");
};
//This function shows the scopeMode headersIdMode buttons
tANDI.showModeButtons = function(mode){
	AndiModule.activeActionButtons.modeButtonsVisible = true;
	var scopeModeButton = $("#ANDI508-scopeMode-button");
	var headersIdButton = $("#ANDI508-headersIdMode-button");
	
	//activeButton
	$((mode === "scope") ? scopeModeButton : headersIdButton)
		.addClass("ANDI508-module-action-active").attr("aria-pressed","true");
	
	//inactiveButton
	$((mode === "scope") ? headersIdButton : scopeModeButton)
		.removeClass("ANDI508-module-action-active").attr("aria-pressed","false");

	//show the buttons
	$(scopeModeButton).add(headersIdButton).add($("#ANDI508-markup-button").prev())
		.removeClass("ANDI508-module-action-hidden");
};

//This function will a table. Only one table at a time
function analyzeTable(table){
	
	var role = $(table).attr("role");
	
	//if role=table or role=grid and has a descendent with role=gridcell
	if(role === "table" || (role === "grid" && $(table).find("[role=gridcell]").first().length)){
		analyzeTable_ARIA(table, role);
	}
	else{
		//loop through the <table> and set data-* attributes
		//Each cell in a row is given a rowIndex
		//Each cell in a column is given a colIndex
		
		//The way tANDI analyzes the table is that it begins looking at the cells first
		//to determine if there is any existing scenarios that should trigger an alert.
		//When each cell has been evaluated, it will then attach alerts to the table element.
		
		//These variables keep track of properties of the table
		rowCount = 0;
		colCount = 0;
		var thCount = 0;
		var tdCount = 0;
		var hasThRow = false;		//true when there are two or more th in a row
		var hasThCol = false;		//true when two or more rows contain a th
		var scopeRequired = false;	//true when scope is required for this table
		var tableHasScopes = false;	//true when cells in the table have scope
		var tableHasHeaders = false;//true when cells in the table have headers
		var row, cell;
		var colIndex, rowIndex, colspan, rowspan;
		var indexValue;
		var scope, headers;
		var rowIndexPlusRowspan, colIndexPlusColspan;
		var tooManyScopeRowLevels = false;
		var scopeRowLevel = ["","",""];
		var tooManyScopeColLevels = false;
		var scopeColLevel = ["","",""];
		var child;
		var colgroupIndex = 0;
		var rowgroupIndex = 0;
		var colgroupSegmentation = false;
		var colgroupSegmentation_segments = 0;
		var colgroupSegmentation_colgroupsPerRowCounter = 0;
		
		//This array is used to keep track of the rowspan of the previous row
		//They will be checked against before assigning the colIndex.
		//This technique is only needed for setting colIndex
		//since the rowIndex is handled more "automatically" by the <tr> tags
		var rowspanArray = [];
		
		//temporarily hide any nested tables so they don't interfere with analysis
		$(table).find("table").addClass("ANDI508-temporaryHide");
		
		//Cache the visible elements (performance)
		var all_rows = $(table).find("tr").filter(":visible");
		var all_th = $(all_rows).find("th").filter(":visible");
		var all_cells = $(all_rows).find("th,td").filter(":visible");
		
		//Is this not a presentation table
		if($(table).attr("role") !== "presentation" && $(table).attr("role") !== "none"){
			
			//This is a little hack to force the table tag to go first in the index
			//so that it is inspected first with the previous and next buttons.
			//Skip index 0, so that later the table can be placed at 0
			testPageData.andiElementIndex = 1;
			
			activeTableType = "Data";
			
			//Loop A (establish the rowIndex/colIndex)
			rowIndex = 0;
			var firstRow = true;
			//var x;
			var cells;
			$(all_rows).each(function(){
				//Reset variables for this row
				row = $(this);
				rowCount++;
				colIndex = 0;
				colgroupSegmentation_colgroupsPerRowCounter = 0;
				
				cells = $(row).find("th,td").filter(":visible");
				
				//Set colCount
				if(colCount < cells.length)
					colCount = cells.length;
			
				//Figure out colIndex/rowIndex colgroupIndex/rowgroupIndex
				$(cells).each(function loopA(){
					//Increment cell counters
					cell = $(this);
					if($(cell).is("th")){
						thCount++;
						if(thCount > 1)
							hasThRow = true;
						if(rowCount > 1)
							hasThCol = true;
						
						scope = $(cell).attr("scope");
						if(scope){
							if(scope == "colgroup"){
								//TODO: more logic here to catch misuse of colgroup
								colgroupIndex++;
								$(cell).attr("data-tANDI508-colgroupIndex",colgroupIndex);
								colgroupSegmentation_colgroupsPerRowCounter++;
							}
							else if(scope == "rowgroup"){
								//TODO: more logic here to catch misuse of colgroup
								rowgroupIndex++;
								$(cell).attr("data-tANDI508-rowgroupIndex",rowgroupIndex);
							}
						}
					}
					else{
						tdCount++;
					}
		
					//get colspan
					//TODO: mark for alert here if value is invalid
					colspan = $(cell).attr("colspan");
					if(colspan === undefined)
						colspan = 1;
					else
						colspan = parseInt(colspan);
					
					//get rowspan
					//TODO: mark for alert here if value is invalid
					rowspan = $(cell).attr("rowspan");
					if(rowspan === undefined)
						rowspan = 1;
					else
						rowspan = parseInt(rowspan);
					
					//Increase the rowspanArray length if needed
					if((rowspanArray.length === 0) || (rowspanArray[colIndex] === undefined))
						rowspanArray.push(parseInt(rowspan));
					else
						firstRow = false;
					
					//store colIndex
					if(!firstRow){
						//loop through the rowspanArray until a 1 is found
						for(var a=colIndex; a<rowspanArray.length; a++){
							if(rowspanArray[a] == 1)
								break;
							else if(rowspanArray[a] > 1){
							//there is a rowspan at this colIndex that is spanning over this row
								//decrement this item in the rowspan array
								rowspanArray[a]--;
								//increment the colIndex an extra amount to essentially skip this colIndex location
								colIndex++;
							}
						}
					}
					
					if(colspan < 2){
						$(cell).attr("data-tANDI508-colIndex",colIndex);
						rowspanArray[colIndex] = rowspan;
						colIndex++;
					}
					else{//colspan > 1
						indexValue = "";
						colIndexPlusColspan = parseInt(colIndex) + colspan;
						for(var b=colIndex; b<colIndexPlusColspan; b++){
							indexValue += b + " ";
							rowspanArray[colIndex] = rowspan;
							colIndex++;
						}
						$(cell).attr("data-tANDI508-colIndex", $.trim(indexValue));
					}
					
					//store rowIndex
					if(rowspan < 2){
						$(cell).attr("data-tANDI508-rowIndex",rowIndex);
					}
					else{
						//rowspanArray[colIndex] = rowspan;
						indexValue = "";
						rowIndexPlusRowspan  = parseInt(rowIndex) + rowspan;
						for(var c=rowIndex; c<rowIndexPlusRowspan; c++)
							indexValue += c + " ";
						$(cell).attr("data-tANDI508-rowIndex",$.trim(indexValue));
					}
				});
				
				//Determine if table is using colgroupSegmentation
				if(colgroupSegmentation_colgroupsPerRowCounter == 1)
					colgroupSegmentation_segments++;
				if(colgroupSegmentation_segments > 1)
					colgroupSegmentation = true;
				
				//There are no more cells in this row, however, the rest of the rowspanArray needs to be decremented.
				//Decrement any additional rowspans from previous rows
				for(var d=colIndex; d<rowspanArray.length; d++){
					if(rowspanArray[d]>1)
						rowspanArray[d]--;
				}
				rowIndex++;
			});
			
			//Loop B - colgroup/rowgroup segementation
			if(colgroupSegmentation || rowgroupIndex > 0){
				var lastColgroupIndex, colgroupsInThisRow, c;
				var lastRowgroupIndex, lastRowgroupRowSpan = 1;
				$(all_rows).each(function loopB(){
					row = $(this);
					if(colgroupSegmentation){
						colgroupsInThisRow = 0;
						$(row).find("th,td").filter(":visible").each(function(){
							if($(this).attr("scope") == "colgroup"){
								colgroupsInThisRow++;
								//store this colgroupIndex to temp variable
								c = $(this).attr("data-tANDI508-colgroupIndex");
							}
							else if(lastColgroupIndex)
								//set this cell's colgroupIndex
								$(this).attr("data-tANDI508-colgroupIndex", lastColgroupIndex);
						});
						
						if(colgroupsInThisRow === 1){
							lastColgroupIndex = c;
							$(row).attr("data-tANDI508-colgroupSegment","true");
						}
					}
					if(rowgroupIndex > 0){
						$(row).find("th,td").filter(":visible").each(function(){
							//Rowgroup
							if($(this).attr("scope") == "rowgroup"){
								lastRowgroupIndex = $(this).attr("data-tANDI508-rowgroupIndex");
								//Get rowspan
								lastRowgroupRowSpan = $(this).attr("rowspan");
								if(!lastRowgroupRowSpan)
									lastRowgroupRowSpan = 1;
							}
							else if(lastRowgroupIndex && lastRowgroupRowSpan > 0)
								$(this).attr("data-tANDI508-rowgroupIndex", lastRowgroupIndex);
						});
						//Decrement lastRowgroupRowSpan
						lastRowgroupRowSpan--;
					}
					
				});
			}

			//Loop C (grab the accessibility components)
			$(all_cells).each(function loopC(){
				cell = $(this);
				
				//scope
				scope = $(cell).attr("scope");
				headers = $(cell).attr("headers");
				
				if(headers)
					tableHasHeaders = true;

				if(scope && $(cell).is("th")){

					if(scope == "row" || scope == "rowgroup"){
						tableHasScopes = true;
						
						//Determine if there are "too many" scope rows
						if(!tooManyScopeRowLevels){
							colIndex = $(cell).attr("data-tANDI508-colIndex");
							for(var f=0; f<=tANDI.scopeLevelLimit; f++){
								if(!scopeRowLevel[f] || (!scopeRowLevel[f] && (scopeRowLevel[f-1] != colIndex))){
									//scope found at this colIndex
									scopeRowLevel[f] = colIndex;
									break;
								}
								else if((f == tANDI.scopeLevelLimit) && (colIndex >= f))
									//scope levelLimit has been exceeeded
									tooManyScopeRowLevels = true;
							}
						}
					}
					else if(scope == "col" || scope == "colgroup"){
						tableHasScopes = true;
						
						//Determine if there are too many scope columns
						if(!tooManyScopeColLevels){
							rowIndex = $(cell).attr("data-tANDI508-rowIndex");
							for(var g=0; g<=tANDI.scopeLevelLimit; g++){
								if(!scopeColLevel[g] || (!scopeColLevel[g] && (scopeColLevel[g-1] != rowIndex))){
									//scope found at this rowIndex
									scopeColLevel[g] = rowIndex;
									break;
								}
								else if((g == tANDI.scopeLevelLimit) && (rowIndex >= g))
									//scope levelLimit has been exceeeded
									tooManyScopeColLevels = true;
							}
						}
					}
				}
				
				//FOR EACH CELL...
				
				//Determine if cell has a child element (link, form element, img)
				child = $(cell).find("a,button,input,select,textarea,img").first();
				
				//Grab accessibility components from the cell
				andiData = new AndiData($(cell));
				andiData.grabComponents($(cell));
				
				if(child.length){
					//Also grab accessibility components from the child
					andiData.grabComponents($(child), true);//overwrite with components from the child, except for innerText
					//Do alert checks for the child
					andiCheck.commonFocusableElementChecks(andiData,$(child));
				}
				else//Do alert checks for the cell
					andiCheck.commonNonFocusableElementChecks(andiData, $(cell));
				
				if(scope){
					andiData.grab_scope($(cell));
					if(AndiModule.activeActionButtons.scopeMode){
						//Only throw scope alerts if in "scope mode"
						if(tooManyScopeRowLevels)
							andiAlerter.throwAlert(alert_0043,[tANDI.scopeLevelLimit,"row"]);
						if(tooManyScopeColLevels)
							andiAlerter.throwAlert(alert_0043,[tANDI.scopeLevelLimit,"col"]);
						andiCheck.detectDeprecatedHTML($(cell));
					}
				}

				if(headers)
					andiData.grab_headers($(cell)); //doesn't actually parse the headers text, just stores the actual value
				
				//If this is not the upper left cell
				if($(cell).is("th") && !andiData.namerFound && !($(this).attr("data-tANDI508-rowIndex") === "1" && $(this).attr("data-tANDI508-colIndex") === "1"))
					//Header cell is empty
					andiAlerter.throwAlert(alert_0132);
				
				andiData.attachDataToElement($(cell));
			});
			
			if(tableHasHeaders){
				//[headers] exist, show mode selection buttons
				if(AndiModule.activeActionButtons.modeButtonsVisible && $("#ANDI508-scopeMode-button").attr("aria-pressed") === "true"){
					tANDI.showModeButtons("scope");
					AndiModule.activeActionButtons.scopeMode = true;
				}
				else{
					tANDI.showModeButtons("headersId");
					AndiModule.activeActionButtons.scopeMode = false;
				}
			}
			else{
				//No [headers], force scopeMode
				tANDI.hideModeButtons();
				AndiModule.activeActionButtons.scopeMode = true;
			}
			
			//FOR THE DATA TABLE...
			
			//This is a little hack to force the table to go first in the index
			var lastIndex = testPageData.andiElementIndex; //remember the last index
			testPageData.andiElementIndex = 0; //setting this to 0 allows the element to be created at index 1, which places it before the cells
			andiData = new AndiData($(table)); //create the AndiData object
			
			andiData.grabComponents($(table));
			andiCheck.commonNonFocusableElementChecks(andiData, $(table));		
			//andiCheck.detectDeprecatedHTML($(table));
			
			if(thCount === 0){
				if(tdCount === 0)//No td or th cells
					andiAlerter.throwAlert(alert_004E);
				else//No th cells
					andiAlerter.throwAlert(alert_0046);
			}
			else{
				//Has th cells
				if(AndiModule.activeActionButtons.scopeMode){
					if(hasThRow && hasThCol)
						scopeRequired = true;
					
					if(!tableHasScopes){
						//Table Has No Scopes
						if(tableHasHeaders)//No Scope, Has Headers
							andiAlerter.throwAlert(alert_004B);
						else//No Scope, No Headers
							andiAlerter.throwAlert(alert_0048);
					}
					
					if(scopeRequired){
						//Check intersections for scope
						var xDirectionHasTh, yDirectionHasTh;
						$(all_th).each(function(){
							//if this th does not have scope
							xDirectionHasTh = false;
							yDirectionHasTh = false;
							rowIndex = $(this).attr("data-tANDI508-rowIndex");
							colIndex = $(this).attr("data-tANDI508-colIndex");
							cell = $(this);
							if(!$(this).attr("scope")){
								//determine if this is at an intersection of th
								var xDirectionThCount = 0;
								var yDirectionThCount = 0;
								$(all_th).each(function(){
									//determine if x direction multiple th at this rowindex
									if(rowIndex == $(this).attr("data-tANDI508-rowIndex"))
										xDirectionThCount++;
									if(colIndex == $(this).attr("data-tANDI508-colIndex"))
										yDirectionThCount++;
									
									if(xDirectionThCount>1)
										xDirectionHasTh = true;
									if(yDirectionThCount>1)
										yDirectionHasTh = true;

									if(xDirectionHasTh && yDirectionHasTh){
										//This cell is at th intersection and doesn't have scope
										if(!$(cell).hasClass("ANDI508-element-danger"))
											$(cell).addClass("ANDI508-element-danger");
										andiAlerter.throwAlertOnOtherElement($(cell).attr("data-ANDI508-index"),alert_0047);
										return false; //breaks out of the loop
									}
								});
							}
						});
					}
				}
				else if(!AndiModule.activeActionButtons.scopeMode){
					if(!tableHasHeaders){
						//Table Has No Headers
						if(tableHasScopes)
							//No Headers, Has Scope
							andiAlerter.throwAlert(alert_004C);
						else
							//No Headers, No Scope
							andiAlerter.throwAlert(alert_004A);
					}
				}
				
				if(tableHasHeaders && tableHasScopes){
					//Table is using both scopes and headers
					andiAlerter.throwAlert(alert_0049);
				}
			}
			
			cellCount = thCount + tdCount;
			
			andiData.attachDataToElement($(table));
			
			testPageData.andiElementIndex = lastIndex; //set the index back to the last element's index so things dependent on this number don't break
		}
		else{
		//==PRESENTATION TABLE==//
			activeTableType = "Presentation";
		
			andiData = new AndiData($(table));
			andiData.grabComponents($(table));
			andiCheck.commonNonFocusableElementChecks(andiData, $(table));
			
			var presentationTablesShouldNotHave = "";
			
			if($(table).find("caption").filter("visible").first().length)
				presentationTablesShouldNotHave += "a &lt;caption&gt;, ";
			
			if($(all_th).first().length)
				presentationTablesShouldNotHave += "&lt;th&gt;, ";
		
			cellCount = 0;
			
			var presTableWithScope = false;
			var presTableWithHeaders = false;
			$(all_cells).each(function(){
				cellCount++;
				if($(this).attr("scope"))
					presTableWithScope = true;
				if($(this).attr("headers"))
					presTableWithHeaders = true;
			});
			
			if(presTableWithScope)
				presentationTablesShouldNotHave += "cells with [scope] attributes, ";
			if(presTableWithHeaders)
				presentationTablesShouldNotHave += "cells with [headers] attributes, ";
			
			if($(table).attr("summary"))
				presentationTablesShouldNotHave += "a [summary] attribute, ";

			if(presentationTablesShouldNotHave)
				//andiAlerter.throwAlert(alert_0041, [presentationTablesShouldNotHave.slice(0,-2)]);
				andiAlerter.throwAlert(alert_0041);
			
			andiData.attachDataToElement($(table));
		}
		
		$(table).find("table").removeClass("ANDI508-temporaryHide");
	}
}

//This function will a table. Only one table at a time
//Paramaters:
//	table: the table element
//	role: the ARIA role (role=table or role=grid)
function analyzeTable_ARIA(table, role){
	//loop through the <table> and set data-* attributes
	//Each cell in a row is given a rowIndex
	//Each cell in a column is given a colIndex
	
	//The way tANDI analyzes the table is that it begins looking at the cells first
	//to determine if there is any existing scenarios that should trigger an alert.
	//When each cell has been evaluated, it will then attach alerts to the table element.
	
	//These variables keep track of the <tr>, <th>, <td> on each <table>
	rowCount = 0;
	colCount = 0;
	var headerCount = 0;
	var nonHeaderCount = 0;
	var hasHeaderRow = false;		//true when there are two or more th in a row
	var hasHeaderCol = false;		//true when two or more rows contain a th
	var row, cell;
	var colIndex, rowIndex, colspan, rowspan;
	var indexValue;
	var rowIndexPlusRowspan, colIndexPlusColspan;
	var child;
	var cell_role = (role === "table") ? "[role=cell]" : "[role=gridcell]";
	//var colgroupIndex = 0;
	//var rowgroupIndex = 0;
	//This array is used to keep track of the rowspan of the previous row
	//They will be checked against before assigning the colIndex.
	//This technique is only needed for setting colIndex
	//since the rowIndex is handled more "automatically" by the <tr> tags
	var rowspanArray = [];
	
	//temporarily hide any nested tables so they don't interfere with analysis
	$(table).find("[role=table],[role=grid]").addClass("ANDI508-temporaryHide");
	
	//Cache the visible elements (performance)
	var all_rows = $(table).find("[role=row]").filter(":visible");
	var all_th = $(all_rows).find("[role=columnheader],[role=rowheader]").filter(":visible");
	var all_cells = $(all_rows).find("[role=columnheader],[role=rowheader],"+cell_role).filter(":visible");

	//This is a little hack to force the table tag to go first in the index
	//so that it is inspected first with the previous and next buttons.
	//Skip index 0, so that later the table can be placed at 0
	testPageData.andiElementIndex = 1;
	
	activeTableType = "Data";
	
	//Loop A (establish the rowIndex/colIndex)
	rowIndex = 0;
	var firstRow = true;
	var x;
	var cells;
	$(all_rows).each(function(){
		//Reset variables for this row
		row = $(this);
		rowCount++;
		colIndex = 0;
		colgroupSegmentation_colgroupsPerRowCounter = 0;
		
		cells = $(row).find("[role=columnheader],[role=rowheader],"+cell_role).filter(":visible");
		
		//Set colCount
		if(colCount < cells.length)
			colCount = cells.length;
	
		//Figure out colIndex/rowIndex colgroupIndex/rowgroupIndex
		$(cells).each(function loopA(){
			//Increment cell counters
			cell = $(this);
			if($(cell).is("[role=columnheader],[role=rowheader]")){
				headerCount++;
				if(headerCount > 1)
					hasHeaderRow = true;
				if(rowCount > 1)
					hasHeaderCol = true;
			}
			else{
				nonHeaderCount++;
			}

			//get colspan
			colspan = $(cell).attr("aria-colspan");
			if(colspan === undefined)
				colspan = 1;
			else
				colspan = parseInt(colspan);
			
			//get rowspan
			rowspan = $(cell).attr("aria-rowspan");
			if(rowspan === undefined)
				rowspan = 1;
			else
				rowspan = parseInt(rowspan);
			
			//Increase the rowspanArray length if needed
			if((rowspanArray.length === 0) || (rowspanArray[colIndex] === undefined))
				rowspanArray.push(parseInt(rowspan));
			else
				firstRow = false;
			
			//store colIndex
			if(!firstRow){
				//loop through the rowspanArray until a 1 is found
				for(var a=colIndex; a<rowspanArray.length; a++){
					if(rowspanArray[a] == 1)
						break;
					else if(rowspanArray[a] > 1){
					//there is a rowspan at this colIndex that is spanning over this row
						//decrement this item in the rowspan array
						rowspanArray[a]--;
						//increment the colIndex an extra amount to essentially skip this colIndex location
						colIndex++;
					}
				}
			}
			
			if(colspan < 2){
				$(cell).attr("data-tANDI508-colIndex",colIndex);
				rowspanArray[colIndex] = rowspan;
				colIndex++;
			}
			else{//colspan > 1
				indexValue = "";
				colIndexPlusColspan = parseInt(colIndex) + colspan;
				for(var b=colIndex; b<colIndexPlusColspan; b++){
					indexValue += b + " ";
					rowspanArray[colIndex] = rowspan;
					colIndex++;
				}
				$(cell).attr("data-tANDI508-colIndex", $.trim(indexValue));
			}
			
			//store rowIndex
			if(rowspan < 2){
				$(cell).attr("data-tANDI508-rowIndex",rowIndex);
			}
			else{
				//rowspanArray[colIndex] = rowspan;
				indexValue = "";
				rowIndexPlusRowspan  = parseInt(rowIndex) + rowspan;
				for(var c=rowIndex; c<rowIndexPlusRowspan; c++)
					indexValue += c + " ";
				$(cell).attr("data-tANDI508-rowIndex",$.trim(indexValue));
			}
		});
				
		//There are no more cells in this row, however, the rest of the rowspanArray needs to be decremented.
		//Decrement any additional rowspans from previous rows
		for(var d=colIndex; d<rowspanArray.length; d++){
			if(rowspanArray[d]>1)
				rowspanArray[d]--;
		}
		rowIndex++;
	});

	//Loop C (grab the accessibility components)
	$(all_cells).each(function loopC(){
		cell = $(this);
		
		//FOR EACH CELL...
		
		//Determine if cell has a child element (link, form element, img)
		child = $(cell).find("a,button,input,select,textarea,img").first();
		
		//Grab accessibility components from the cell
		andiData = new AndiData($(cell));
		andiData.grabComponents($(cell));
		
		if(child.length){
			//Also grab accessibility components from the child
			andiData.grabComponents($(child), true);//overwrite with components from the child, except for innerText
			//Do alert checks for the child
			andiCheck.commonFocusableElementChecks(andiData,$(child));
		}
		else//Do alert checks for the cell
			andiCheck.commonNonFocusableElementChecks(andiData, $(cell));
		
		//If this is not the upper left cell
		if($(cell).is("[role=columnheader],[role=rowheader]") && !andiData.namerFound && !($(this).attr("data-tANDI508-rowIndex") === "1" && $(this).attr("data-tANDI508-colIndex") === "1"))
			//Header cell is empty
			andiAlerter.throwAlert(alert_0132);
		
		andiData.attachDataToElement($(cell));
	});
	
	//Default to scope mode
	tANDI.hideModeButtons();
	AndiModule.activeActionButtons.scopeMode = true;
	
	//FOR THE DATA TABLE...
	
	//This is a little hack to force the table to go first in the index
	var lastIndex = testPageData.andiElementIndex; //remember the last index
	testPageData.andiElementIndex = 0; //setting this to 0 allows the element to be created at index 1, which places it before the cells
	andiData = new AndiData($(table)); //create the AndiData object
	
	andiData.grabComponents($(table));
	andiCheck.commonNonFocusableElementChecks(andiData, $(table));		
	
	if(all_rows.length === 0)//no rows
		andiAlerter.throwAlert(alert_004H,[role]);
	else if(headerCount === 0){
		if(nonHeaderCount === 0)//No cell or gridcell
			andiAlerter.throwAlert(alert_004F,[role,cell_role]);
		else//No header cells
			andiAlerter.throwAlert(alert_004G,[role]);
	}

	cellCount = headerCount + nonHeaderCount;
	
	andiData.attachDataToElement($(table));
	
	testPageData.andiElementIndex = lastIndex; //set the index back to the last element's index so things dependent on this number don't break

	$(table).find(".ANDI508-temporaryHide").removeClass("ANDI508-temporaryHide");
}

tANDI.viewList_tableReady = false;
tANDI.viewList_buttonAppended = false;

//This function will build the Table List html and inject into the ANDI Bar
tANDI.viewList_buildTable = function(){
	
	//Build scrollable container and table head
	var appendHTML = "<div id='tANDI508-viewList' class='ANDI508-viewOtherResults-expanded' style='display:none;'>"+
		"<div class='ANDI508-list-scrollable'><table id='ANDI508-viewList-table' aria-label='List of Tables' tabindex='-1'><thead><tr>"+
		"<th scope='col' style='width:10%'>#</th>"+
		"<th scope='col' style='width:75%'>Table&nbsp;Name</th>"+
		"<th scope='col' style='width:15%'>Naming&nbsp;Method</th>"+
		"</tr></thead><tbody>";
		
	//Build table body
	var tableName;
	for(var x=0; x<tableArray.length; x++){
		appendHTML += "<tr";
		//Highlight the select table
		if($(tableArray[x]).hasClass("ANDI508-element"))
			appendHTML += " class='ANDI508-table-row-inspecting' aria-selected='true'";
		
		tableName = preCalculateTableName(tableArray[x]);
		
		appendHTML += "><th scope='role'>"+parseInt(x+1)+"</th><td>"+
			"<a href='javascript:void(0)' data-ANDI508-relatedTable='"+x+"'>"+
			tableName[0]+"</a></td><td style='font-family:monospace'>"+tableName[1]+"</td></tr>";
	}
		
	//Insert into ANDI Bar
	appendHTML += "</tbody></table></div></div>";
	$("#ANDI508-additionalPageResults").append(appendHTML);
	
	//This function precalculates the table name
	//Returns an array with the tableName and the namingMethodUsed
	function preCalculateTableName(table){
		var tableName, namingMethod;
		var role = $(table).attr("role");
		if(role === "presentation" || role === "none"){
			tableName = "<span style='font-style:italic'>Presentation Table</span>";
			namingMethod = "";
		}
		else{
			tableName = grabTextFromAriaLabelledbyReferences(table);
			namingMethod = "aria-labelledby";
			if(!tableName){
				tableName = cleanUp($(table).attr("aria-label"));
				namingMethod = "aria-label";
			}
			if(!tableName){
				tableName = cleanUp($(table).find("caption").filter(":visible").first().text());
				namingMethod = "&lt;caption&gt;";
			}
			if(!tableName){
				tableName = cleanUp($(table).attr("summary"));
				namingMethod = "summary";
			}
			if(!tableName){
				tableName = cleanUp($(table).attr("title"));
				namingMethod = "title";
			}
			
			//No Name, check if preceeded by heading
			if(!tableName){
				var prevElement = $(table).prev();
				if($(prevElement).is("h1,h2,h3,h4,h5,h6")){
					tableName = "<span class='ANDI508-display-caution'><img alt='Caution: ' src='"+icons_url+"caution.png' /> "+
						"Data Table with No Name, but Preceded by Heading: </span>"+
						cleanUp($(prevElement).text());
					namingMethod = "&lt;"+$(prevElement).prop("tagName").toLowerCase()+"&gt;";
				}
			}

			//No Name
			if(!tableName){
				tableName = "<span class='ANDI508-display-caution'><img alt='Caution: ' src='"+icons_url+"caution.png' /> "+
				"Data Table with No Name</span>";
				namingMethod = "<span class='ANDI508-display-caution'>None</span>";
			}

		}
		return [tableName,namingMethod];
		
		function cleanUp(text){
			return andiUtility.formatForHtml($.trim(text));
		}
		
		//This function gets the text from the aria-labelledby references
		//TODO: some code is being duplicated here. Difference here is that alerts aren't needed
		function grabTextFromAriaLabelledbyReferences(element){
			var ids = $.trim($(element).attr("aria-labelledby"));//get the ids to search for
			var idsArray = ids.split(" "); //split the list on the spaces, store into array. So it can be parsed through one at a time.
			var accumulatedText = "";//this variable is going to store what is found. And will be returned
			var referencedId, referencedElement, referencedElementText;
			//Traverse through the array
			for(var x=0; x<idsArray.length; x++){
				//Can the aria list id be found somewhere on the page?
				if(idsArray[x] !== ""){
					referencedElement = document.getElementById(idsArray[x]);
					referencedElementText = "";
					if($(referencedElement).attr("aria-label"))//Yes, this id was found and it has an aria-label
						referencedElementText += andiUtility.formatForHtml($(referencedElement).attr("aria-label"));
					else if($(referencedElement).html() !== undefined)//Yes, this id was found and the reference contains something
						referencedElementText += andiUtility.formatForHtml(andiUtility.getTextOfTree(referencedElement, true));
					//Add to accumulatedText
					accumulatedText += referencedElementText + " ";
				}
			}
			return $.trim(accumulatedText);
		}
	}
};

//This function attaches the click,hover,focus events to the items in the view list
tANDI.viewList_attachEvents = function(){
	//Add focus click to each link (output) in the table
	$("#ANDI508-viewList-table td a").each(function(){
		andiLaser.createLaserTrigger($(this),$(tableArray[$(this).attr("data-ANDI508-relatedTable")]));
	})
	.click(function(){//Jump to this table
		//Make this link appear selected
		tANDI.reset();
		activeTableIndex = $(this).attr("data-ANDI508-relatedTable");
		analyzeTable(tableArray[activeTableIndex]);
		tANDI.results();
		andiFocuser.focusByIndex(1);
		tANDI.redoMarkup();
		tANDI.viewList_highlightSelectedTable(activeTableIndex, false);
		andiResetter.resizeHeights();
		return false;
	});
};

//This function highlights the active table in the table list
//index: refers to the index of the table in the tableArray
tANDI.viewList_highlightSelectedTable = function(index, scrollIntoView){
	if(tANDI.viewList_tableReady){
		var activeTableFound = false;
		$("#ANDI508-viewList-table td a").each(function(){
			if(!activeTableFound && $(this).attr("data-ANDI508-relatedTable") == index){
				//this is the active table
				$(this).attr("aria-selected","true").closest("tr").addClass("ANDI508-table-row-inspecting");
				if(scrollIntoView)
					this.scrollIntoView();
				activeTableFound = true;
			}
			else//not the active table
				$(this).removeAttr("aria-selected").closest("tr").removeClass();
		});
	}
};

//This function hide/shows the view list
tANDI.viewList_toggle = function(btn){
	if($(btn).attr("aria-expanded") === "false"){
		//show List, hide alert list
		$("#ANDI508-alerts-list").hide();
		andiSettings.minimode(false);
		$(btn)
			.addClass("ANDI508-viewOtherResults-button-expanded")
			.html(listIcon+"hide table list")
			.attr("aria-expanded","true")
			.find("img").attr("src",icons_url+"list-on.png");
		$("#tANDI508-viewList").slideDown(AndiSettings.andiAnimationSpeed).focus();
		AndiModule.activeActionButtons.tableListVisible = true;
	}
	else{
		//hide List, show alert list
		$("#tANDI508-viewList").slideUp(AndiSettings.andiAnimationSpeed);
		//$("#ANDI508-resultsSummary").show();
		if(testPageData.numberOfAccessibilityAlertsFound > 0)
			$("#ANDI508-alerts-list").show();
		$(btn)
			.removeClass("ANDI508-viewOtherResults-button-expanded")
			.html(listIcon+"view table list")
			.attr("aria-expanded","false");
		AndiModule.activeActionButtons.tableListVisible = false;
	}
};

//This function will overlay the table markup.
AndiOverlay.prototype.overlayTableMarkup = function(){
	var type, scope, headers, id, role, markupOverlay, ariaLabelledby, ariaLabel, ariaDescribedby;
	$("#ANDI508-testPage .ANDI508-element:not(table,[role=table],[role=grid])").each(function(){

		cellType = $(this).prop("tagName").toLowerCase();
		scope = $(this).attr("scope");
		headers = $(this).attr("headers");
		id = this.id;
		
		role = $(this).attr("role");

		markupOverlay = cellType;

		if(role){
			markupOverlay += " role=" + role;
		}
		if(id)
			markupOverlay += " id=" + id;
		if(headers)
			markupOverlay += " headers=" + headers;
		if(scope)
			markupOverlay += " scope=" + scope;

		$(this).prepend(andiOverlay.createOverlay("ANDI508-overlay-tableMarkup", markupOverlay));

		//reset the variables
		cellType = "";
		scope = "";
		headers = "";
		id = "";

	});
};

//This function will detect if markup button should be re-pressed
tANDI.redoMarkup = function(){
	if(AndiModule.activeActionButtons.markup){
		andiOverlay.overlayButton_off("overlay",$("#ANDI508-markup-button"));
		andiOverlay.removeOverlay("ANDI508-overlay-tableMarkup");
		$("#ANDI508-markup-button").click();
	}
};

//This function returns true if any index match is found.
//The colIndex/rowIndex could contain a space delimited array
function index_match(a,b){
	var match = false;
	var	aX = buildArrayOnIndex(a);
	var	bY = buildArrayOnIndex(b);

	//compare
	for(var x=0; x<aX.length; x++){
		for(var y=0; y<bY.length; y++){
			if(aX[x] == bY[y]){
				match = true;
				break;
			}
		}
	}
	return match;
}
//This function returns true if any indexes in "a" are greater than "b".
//The colIndex/rowIndex could contain a space delimited array
function index_greaterThan(a,b){
	var greaterThan = false;
	var	aX = buildArrayOnIndex(a);
	var	bY = buildArrayOnIndex(b);
	
	//compare
	for(var x=0; x<a.length; x++){
		for(var y=0; y<b.length; y++){
			if(aX[x] > bY[y]){
				greaterThan = true;
				break;
			}
		}
	}
	return greaterThan;
}

//This function will build an array based on the value passed in.
//If it is space delimited it returns an array greater than 1.
//If it is not space delimited it returns an array of length 1.
//This is mainly done to fix an IE7 bug with array handling.
function buildArrayOnIndex(value){
	if(value.toString().includes(" "))
		return value.split(" ");
	else
		return [value];
}

//analyze tables
tANDI.analyze();
tANDI.results();

//When relaunching the module, if the table list was previously visible, click the table button
if(AndiModule.activeActionButtons.tableListVisible)
	$("#ANDI508-viewTableList-button").click();

}//end init
