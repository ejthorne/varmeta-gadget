/// <reference path="SCMacros.js" />
/// <reference path="DynWin.js" />
/// <reference path="ScreenInfo.js" />
/// <reference path="MacDesign.js" />
/// <reference path="FlowEdit.js" />
/// <reference path="MacrosMgr.htm" />
/// <reference path="DragMgr.js" />
/// <reference path="Plugin.js" />
/// <reference path="Plugins/ActionBlock.js" />
/// <reference path="Plugins/CoreActions.js" />
/// <reference path="Plugins/ActionDesigner.js" />
/// <reference path="Plugins/FlowDesigner.js" />
var macroText = "",
	 macroPub = true,
	 macroName = "NEW",
	 macroWizState = "new",
	 pendedField = null,
	 modelScnWidth = 600,
	 modelScnHeight = 50,
	 wizDoc = null,
	 wizGenRestart = true,
	 recogsClosed = false,
	 changesClosed = false,
	 readsClosed = true,
	 newReadFieldCount = 0,
	 propHeight = 200,
	 dragger = new flow.macs.DragMgr(),
	 lastGenText = null,
	 design = null,
	 plugin=null,
	 fieldCounter=1;

if (!flow.logic)
	flow.logic = {};

flow.logic.FlynetTypeList =
{
	'Simple':
	{
		'text': 'Replay Screen Macro',
		'title': 'Provides User Prompt to initialize/verify variable values, then runs through screens as recorded, reading and writing as defined in the Flynet Macro Designer...',
		'visible': function () { return true },
		'newActions': ['UIPrompt', 'ScreenIO']
	},
	'UserLoop':
	{
		'text': 'Restartable User Prompted Macro',
		'title': 'Restartable because ending screen is same as starting screen--Provides User Prompt to initialize/verify variable values, then runs through screens as recorded, reading and writing as defined in the Flynet Macro Designer...then restarts...',
		'visible': function (design) { return design.restartable },
		'newActions': [{ 'id': 'UserLoop', 'newActions': ['ScreenIO']}]
	},
	'DataLoop':
	{
		'text': 'Restartable Data-driven Macro',
		'title': 'Restartable because ending screen is same as starting screen--Reads one or more rows of data from an external plugin, like Excel or a CSV file, then provides User Prompt to initialize/verify variable values, then runs through screens as recorded, reading and writing as defined in the Flynet Macro Designer...then restarts to next row of data...',
		'visible': function (design) { return design.restartable },
		'newActions': ['ExtImport', { 'id': 'Iterator', 'newActions': ['UIPrompt', 'ScreenIO']}]
	}
}

flow.logic.GadgetTypeList =
{
	'Simple':
	{
		'text': 'Send EMail',
		'title': 'Provides User Prompt to initialize/verify variable values, sends formatted email containing variable values from a template',
		'visible': function () { return true },
		'newActions': ['UIPrompt', 'ExtExport']
	},
	'UserLoop':
	{
		'text': 'Restartable User Prompted Macro',
		'title': 'Restartable because ending screen is same as starting screen--Provides User Prompt to initialize/verify variable values, then runs through screens as recorded, reading and writing as defined in the Flynet Macro Designer...then restarts...',
		'visible': function (design) { return design.restartable },
		'newActions': [{ 'id': 'UserLoop', 'newActions': []}]
	},
	'DataLoop':
	{
		'text': 'Restartable Data-driven Macro',
		'title': 'Restartable because ending screen is same as starting screen--Reads one or more rows of data from an external plugin, like Excel or a CSV file, then provides User Prompt to initialize/verify variable values, then runs through screens as recorded, reading and writing as defined in the Flynet Macro Designer...then restarts to next row of data...',
		'visible': function (design) { return design.restartable },
		'newActions': ['ExtImport', { 'id': 'Iterator', 'newActions': ['UIPrompt']}]
	}
}

function MacWizard(doc,elem)
{
	wizDoc = doc;
	design = fvm.design;
	if (!design || !design.wizElem)
	{
		if (!design)
			design = fvm.design = new flow.macs.MacDesign();
		design.wizElem = elem;
		design.wizThumbsActive = true;
		fvm.recPending
		flow.macs.EditNewRec(design); //will initialize first time through...
		design.SetActiveScreen(0);
	}
	DrawWiz(design, true);
}

function WizPrev()
{
	if (design.PrevScreen())
		DrawWiz(design);
}

function ThumbClick(s)
{
	design.SetActiveScreen(s);
	DrawWiz(design);
}

function WizNext()
{
	if (design.NextScreen())
		DrawWiz(design);
}

function WizOptions()
{
	design.SetActiveScreen(design.screens.length); // triggers options mode
	DrawWiz(design);
}

function GetNextReadName()
{
	newReadFieldCount++;
	return 'Read'+newReadFieldCount;
}

function UpdSizer(id, elem, topY, docHeight, IsMoving)
{
	design.wizSizerElem.className = 'active';
	if (!IsMoving)
	{
		var newHeight = docHeight - topY - design.wizSizerElem.offsetHeight;
		design.wizPropsElem.style.height = newHeight + 'px';
		design.wizSizerElem.className = 'dormant';
		window.setTimeout("Sizer()",1);
		window.setTimeout("SetSizerLoc()",20);
	}
}

function SizerMM(id,elem,mouseX,mouseY)
{
	return 'n-move';
}

function DrawWiz(design, rebuild)
{
	var showScreen = (design.screen != null),
		 atScreen = design.screen,
		 t, prevScn, nextScn;
	if (rebuild)
	{
		design.wizElem.innerHTML = '';
		if (!design.wizScreenElem)
		{
			design.wizScreenElem = document.createElement('div');
			design.wizScreenElem.id = "wizTop";
		}
		design.wizElem.appendChild(design.wizScreenElem);
		if (flow.macs.screensActive)
		{
			if (!design.wizThumbsElem)
			{
				design.wizThumbsElem = document.createElement('div');
				design.wizThumbsElem.id = "wizBottom";
			}
			design.wizElem.appendChild(design.wizThumbsElem);
			if (!design.wizPropsElem)
			{
				design.wizPropsElem = document.createElement('div');
				design.wizPropsElem.id = "wizProps";
			}
			design.wizElem.appendChild(design.wizPropsElem);
			if (!design.wizSizerElem)
			{
				design.wizSizerElem = document.createElement('div');
				design.wizSizerElem.id = "wizSizer";
				design.wizSizerElem.className = "dormant";
			}
			design.wizElem.appendChild(design.wizSizerElem);
			dragger.initDrag(design.wizSizerElem, "wizSizer", UpdSizer, SizerMM);
		}
		wizThumbsReady = false;
	}
	if (macroWizState=="new")
	{
		newReadFieldCount=0;
		macroWizState="started";
	}
	t='<div class="wizard"><table id="wizTable" cellpadding="0" cellspacing="0"><tr>';
	t+='<td class="wizleft" align="center"';
	prevScn=design.GetScreen(design.screenIndex-1);
	if (prevScn)
		t+=' title="Click to View Previous Screen Information (screen id='+prevScn.id+')" onclick="WizPrev()"><img width="30" height="100" src="img/previous.gif" id="prevButton" class="wizButton" />';
	else
		t+=' style="cursor:default"><img src="img/p.gif" width="30"/>';
	t+='</td><td class="wizmid" align="center">';
	if (showScreen)
	{
		t+=atScreen.GetHTML();
		t += '<div id="scnInfoForm" class="elemTitle" style="float:none;text-align:left;border-bottom:solid 3px #303030;background-color:#ccdddd;"><form name="scnidform" id="scnidform" action="#" onsubmit="return false">';
		t+='Screen Name: <input maxlength="20" style="width:10em;font-size:1.0em;" name="txtScreenID" id="txtScreenID" onchange="flow.macs.UpdScnRecog(this,-1)" value="'+atScreen.id+'" />';
		t+='</form></div>';
	}
	else
		t+=WizOptionsHtml();
	t+='</td><td class="wizright" align="center"';
	nextScn=design.GetScreen(design.screenIndex+1);
	if (nextScn)
		t+=' title="Click to View Next Screen Information (screen id='+nextScn.id+')" onclick="WizNext()"><img width="30" height="100" src="img/next.gif" id="nextButton" class="wizButton" />';
	else if (showScreen)
		t+=' title="Click to View Macro Script Generation Options" onclick="WizOptions()"><img width="30" height="100" src="img/next.gif" id="nextButton" class="wizButton" />';
	else
		t+=' style="cursor:default"><img src="img/p.gif" width="30"/>';
	t+='</td></tr>';
	t+='</table>'
	design.wizScreenElem.innerHTML = t;
	if (flow.macs.screensActive)
	{
		if (showScreen)
		{
			t = '<div class="defPanel" id="defRecogs">';
			if (recogsClosed)
				t += PanelClosedHtml('closedRec', 'OpenRecogs', 'Recognition Definitions Panel') + '</div>';
			else
				t += atScreen.GetRecogSettings() + '</div>';
			t += '<hr style="margin-top:1px;margin-bottom:1px" />';
			t += '<div class="defPanel" id="defChanges">';
			if (changesClosed)
				t += PanelClosedHtml('closedChg', 'OpenChanges', 'Field Change Definitions Panel') + '</div>';
			else
				t += atScreen.GetChangeSettings() + '</div>';
			t += '<hr style="margin-top:1px;margin-bottom:1px" />';
			t += '<div class="defPanel" id="defReads">';
			if (readsClosed)
				t += PanelClosedHtml('closedRead', 'OpenReads', 'Field Read Definitions Panel') + '</div>';
			else
				t += atScreen.GetReadSettings() + '</div>';
			t += '<hr style="margin-top:1px;margin-bottom:1px" />';
			t += '</div>';
			design.wizPropsElem.innerHTML = t;
		}
		else
		{
			design.wizPropsElem.innerHTML = '';
		}
		if (!wizThumbsReady)
		{
			design.wizThumbsElem.innerHTML = DrawThumbs();
			wizThumbsReady = true;
		}
		window.setTimeout('SetThumbsWidth()', 1);
		window.setTimeout('SetSizerLoc()', 50);
	}
	else
		window.setTimeout('SetThumbsWidth()', 1);

	if (showScreen)
		window.setTimeout('design.screen.AddElements(document)', 100);
	else
		window.setTimeout('WizOptionsShow()', 100);
}

function CreateAndShowStandard()
{
	var actionBlockConst = fvm.GetAction('MainBlock'),
		 designConst = fvm.GetDesigner('BlockDesigner'),
		 actionBlock,
		 designer;
	if (!actionBlockConst)
	{
		alert('Not able to construct new ActionBlock for editing--check available plugins...');
		return;
	}
	if (!designConst)
	{
		alert('Not able to construct new ActionBlockDesigner for editing--check available plugins...');
		return;
	}
	actionBlock = new actionBlockConst.newFunc(fvm, "Main");
	actionBlock.AddFilter('Callable', false);
	actionBlock.AddAction('UIPrompt', 'UserPrompt');
	actionBlock.AddAction('ScreenIO', 'ScreenInteractions');
	designer = new designConst.newFunc(document, null, fvm, false, design, actionBlock,
		function (actionBlock, msg)
		{
			if (msg == 'ok')
			{
				alert('Design created?');
			}
		});
		designer.Draw();
}

function WizOptionsHtml()
{
	var restarted = (design.screens && 
						  (design.screens.length>0) &&
						  (design.screens[0].id == design.screens[design.screens.length - 1].id)),
		 t = '',
		 sources = fvm.GetPluginList(true, false),
		 targets = fvm.GetPluginList(false, true),
		 restartChecked, noRestartChecked;
	if (!flow.macs.screensActive)
		modelScnHeight = 600;
	t+= '<div style="position:relative;text-align:center;overflow:none;width:' + modelScnWidth + 'px;height:' + modelScnHeight + 'px;">';
	t += '<div id="FlowEditor" style="position:relative; width:' + modelScnWidth + 'px;height:' + (modelScnHeight-50) + 'px;"></div>';
	t+='<div class="optsInfo" style="margins:auto">';
	t+='Generate and View Macro: <form style="float:right;display:inline;margin:0;padding:0" name="genmac" href="#">';
	t+='<button onclick="GenAndEditMacro()">Generate Macro</button></form>';
	t+='<div style="clear:both"></div>';
	t+='</div>';
	return t;
}

function WizOptionsShow()
{
	var designConst = fvm.GetDesigner('FlowDesigner'),
		 editorElem = document.getElementById('FlowEditor'),
		 fd = new designConst.newFunc(document, editorElem, fvm, design, (flow.macs.screensActive)? flow.logic.FlynetTypeList: flow.logic.GadgetTypeList, 'Simple');
	flow.logic.designer = fd;
	fd.height = editorElem.offsetHeight;
	fd.width = editorElem.offsetWidth;
	fd.Display();
}

function GenAndEditMacro()
{
	var newGenText = null;
	fvm.keepEditor = true;
	if (lastGenText)
	{
		if (macroText.replace(/\r\n/g, '\n') != lastGenText.replace(/\r\n/g, '\n'))
		{
			ok = confirm('You have changed the macro since the last time it was generated--continue with new generation?');
			if (!ok)
				return;
		}
	}
	else
	{
		macroName = 'NEW';
		macroPub = false;
	}
	design.screenIOCode = flow.macs.EditNewRec('  ');
	newGenText = flow.logic.designer.GenCode();
	if (newGenText)
	{
		macroText = lastGenText = newGenText;
		FocusEditor();
	}

}

//---------------------
//------------------------- Macro function generator ----------------------------
//---------------------
var ks = '';
flow.macs.EditNewRec = function (tab)
{
	var t = "",
		 ct = "", //constructor cod
		 state = "start",
		 indent = "",
		 currentScreen = null,
		 screenID = 0,
		 lastFsetKo = null,
		 fref, idx, ko, fset, lastScreen, s,
		 activeScn = null,
		 aidSent = false,
		 lines = [];

	if (!design.recKeys)
	{
		design.recKeys = new Array();
		macroName = "NEW";
		if (!fvm.recKeys)
			return;
		for (idx = 0; idx < fvm.recKeys.length; idx++)
		{
			ko = fvm.recKeys[idx];
			fset = null;
			ks = 'idx=' + idx + ';type=' + ko.type;
			switch (ko.type)
			{
				case "fset":
					fset = GetFieldSet(ko.key.fld, null, true);
					fref = currentScreen.SaveField(fset, design.recVars);
					if (fref && lastFsetKo)
					{
						lastFsetKo.key.fld.fref = fref;
						design.AddRecKey(lastFsetKo);
					}
					lastFsetKo = ko;
					break;
				case "aid": // fvm.RecKey(em.sendAID,"aid");
					fset = GetFieldSet(null, null, true);
					fref = currentScreen.SaveField(fset, design.recVars);
					if (fref && lastFsetKo)
					{
						lastFsetKo.key.fld.fref = fref;
						design.AddRecKey(lastFsetKo);
						lastFsetKo = null;
					}
					design.AddRecKey(ko);
					break;
				case "fkey": // fvm.RecKey({'key':String.fromCharCode(kc),'fld':kev.field},'fkey');
					break;
				case "fn":  // fvm.RecKey(fnHandler,"fn");
					break;
				case "scnout":
					currentScreen.SetScnOut(ko);
					design.AddRecKey(ko);
					break;
				case "scnin":
					fset = GetFieldSet(null, indent, true);
					if (fset && currentScreen)
						fref = currentScreen.SaveField(fset, design.recVars);
					else
						fref = null;
					if (fref && lastFsetKo)
					{
						lastFsetKo.key.fld.fref = fref;
						design.AddRecKey(lastFsetKo);
					}
					currentScreen = new flow.macs.ScreenInfo(screenID, ko);
					design.screens.push(currentScreen);
					ko.refScn = currentScreen;
					design.AddRecKey(ko);
					screenID++;
					break;
			}
		}
		fset = GetFieldSet(null, indent, true);
		fref = currentScreen.SaveField(fset, design.recVars);
		if (fref && lastFsetKo)
		{
			lastFsetKo.key.fld.fref = fref;
			design.AddRecKey(lastFsetKo);
		}
		lastScreen = null;
		for (s = 0; s < design.screens.length; s++)
		{
			design.screens[s].SetupRecogs();
			if (lastScreen != null)
				design.screens[s].prevScreenId = lastScreen.id;
			lastScreen = design.screens[s];
		}
		design.initialized = true;
	}
	pendedField = null;
	for (idx = 0; idx < design.recKeys.length; idx++)
	{
		ko = design.recKeys[idx];
		switch (state)
		{
			case "start":
				if (ko.type == 'scnin')
				{
					ct += "// Screen Recognition Information\n";
					ct += design.screenRecogs = GetScreenRecogs();
					ct += "\n// Parameter/field values and prompting options\n";
					lines.push('var scn = macro.scn = macro.runtime.ActiveScreen();');
					lines.push('switch(scn.id) {');
					indent = (tab) ? tab : '  ';
					if (ko.type == 'scnin')
					{
						lines.push('case "' + ko.refScn.GetRecogID() + '":');
						aidSent = false;
						ko.refScn.GetFieldReadScript(lines, indent);
						activeScn = ko.refScn;
					}
					state = "inScreen";
				}
				break;
			case "inScreen":
				switch (ko.type)
				{
					case "aid": // fvm.RecKey(em.sendAID,"aid");
						if (!aidSent)
						{
							aidSent = true;
							AddLine(lines, GetFieldSet(null, indent));
							if (activeScn)
								AddLine(lines, activeScn.GetExtActions());
							lines.push(indent + 'scn.SendAidKey("' + ko.key + '");');
						}
						break;
					case "fset": // fvm.RecKey({'val':val,'fld':kev.field},'fset');
						AddLine(lines, GetFieldSet(ko.key.fld, indent));
						break;
					case "fkey": // fvm.RecKey({'key':String.fromCharCode(kc),'fld':kev.field},'fkey');
						lines.push(indent + '// fkey--key="' + ko.key.key + '", flen=' + ko.key.fld.len + ', foffset=' + ko.key.fld.offset + ', fval="' + ko.key.fld.val + '"');
						break;
					case "fn":  // fvm.RecKey(fnHandler,"fn");
						AddLine(lines, GetFieldSet(null, indent));
						//t+=indent+'// fnHandler="'+ko.key+'"\n';
						break;
					case "scnin": // flash screen...???
						aidSent = false;
						lines.push('// Flash screen...ignore.');
						lines.push(indent + 'break;');
						lines.push('case "' + ko.refScn.GetRecogID() + '": //in');
						ko.refScn.GetFieldReadScript(lines, indent);
						activeScn = ko.refScn;
						break;
					case "scnout":
						AddLine(lines, GetFieldSet(null, indent));
						if (!aidSent)
						{
							aidSent = true;
							if (activeScn)
								AddLine(lines, activeScn.GetExtActions());
							lines.push(indent + 'scn.SendAidKey("' + ko.key.aidKey + '");');
						}
						lines.push(indent + 'break;');
						state = "outScreen";
						indent = "";
						break;
				}
				break;
			case "outScreen":
				lines.push('case "' + ko.refScn.GetRecogID() + '": //out');
				aidSent = false;
				indent = '  ';
				ko.refScn.GetFieldReadScript(lines, indent);
				activeScn = ko.refScn;
				//if (ko.type=='scnin')
				//	t+='/* Screen IN:\n'+ShowScreen(ko.key.scn)+indent+'*/\n'; 
				state = "inScreen";
				break;
		}
	}
	if (state == "inScreen")
	{
		AddLine(lines, GetFieldSet(null, indent));
		if (activeScn)
			AddLine(lines, activeScn.GetExtActions());
		lines.push('***OK***');
		lines.push(indent + 'break;');
	}
	lines.push('default:');
	lines.push('  return {"ok":false, "level":"warning", "message":"Unknown screen appeared ("+scn.id+")--macro ending..."};');
	lines.push('}');
	return lines;
}

//---------------------
//--------------------------------------Macro Generation assist functions----------------------
//---------------------
function GetScreenRecogs()
{
	var t = '// Each Screen Recog= "id":{"row":row,"col":col,"len":len,"text":text}\n',
		 needComma = false,
		 needComma2,
		 s, scn, maxRecogs, indent, r, rec;
	t+='this.runtime.ScreenRecogInfo={\n';
	for(s=0;s<design.screens.length;s++)
	{
		scn=design.screens[s];
		if (scn.IsDuplicate)
			continue;
		maxRecogs=2;
		if (needComma)
			t+=',\n';
		else
			needComma=true;
		t+=' "'+scn.id+'":';
		indent='\n   ';
		if (scn.recogs && 
			 (scn.recogs.length>1))
		{
			t+='\n  [\n';
			indent='   ';
		}
		needComma2=false;
		if (scn.recogs)
		{
			for(r=0;r<scn.recogs.length;r++)
			{
				rec=scn.recogs[r];
				if (needComma2)
					t+=',\n';
				else
					needComma2=true;
				if (rec.IsClear)
					t+=indent+'{"IsClear":true}';
				else
					t+=indent+'{"row":'+(rec.row+1)+',"col":'+(rec.col+1)+',"len":'+rec.len+',"text":"'+rec.text+'"}';
				maxRecogs--;
				if (!maxRecogs)
					break;
			}
			if (scn.recogs.length>1)
			{
				t+='\n  ]';
				indent='';
			}
		}
	}
	t+='\n};\n';
	return t;
}

function AddLine(lines, text)
{
	if (text &&
		 (text != ''))
		lines.push(text);
}

function GetFieldSet(fld, indent, asObj)
{
	var retFld=null;
	if (fld==null)
	{
		if (pendedField)
		{
			retFld=pendedField;
			pendedField=null;
		}
	}
	else
	{
		if (!pendedField)
			pendedField=fld;
		else
		{
			if (pendedField.offset != fld.offset)
			{
				retFld = pendedField;
				pendedField = fld;
			}
			else
				pendedField = fld; // save latest copy...
		}
	}
	if (asObj)
	{
		return retFld;
	}
	else
	{
		if (retFld)
		{
			if (retFld.fref)
				return indent+'scn.SetField('+retFld.fref.row+','+retFld.fref.col+',this.vars.'+retFld.fref.name+');';
			else
				return indent+'scn.SetField('+retFld.offset+',"'+retFld.val+'");';
		}
		else
			return '';
	}
}
function ShowScreen(rows)
{
	var t = '            1         2         3         4         5         6         7         8         9         0         1         2         3  '.substr(0, rows[0].length + 2) + '\n',
		 i, row, r;
		t+='   123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012'.substr(0,rows[0].length+2)+'\n';
	for(i=0;i<rows.length;i++)
	{
		row=rows[i];
		if (row=='')
			break;
		r=''+(i+1);
		if (r.length<2)
			r=' '+r;
		t+=r+' '+row+'\n';	
	}
	return t;
}

function CheckRecogMatch(scn,rec)
{
	var lines = scn.scnin.key.scn,
		 isClear, line
	if (rec.IsClear)
	{
		isClear=true;
		for(line=0;line<lines.length;line++)
		{
			if (!/^\s*$/.test(lines[line]))
			{
				isClear=false;
				break;
			}
		}
		return isClear;
	}
	else if (lines[rec.row].substr(rec.col,rec.len)==rec.text)
		return true;
	return false;
}

function CloseThumbs()
{
	design.wizThumbsActive=false;
	SetThumbsWidth();
	window.setTimeout('SetSizerLoc()',10);
}

function OpenThumbs()
{
	design.wizThumbsActive = true;
	design.wizThumbsElem.innerHTML = DrawThumbs();
	SetThumbsWidth();
	window.setTimeout("Sizer()",1);
	window.setTimeout('SetSizerLoc()',10);
}

function CloseRecogs()
{
	var recogElem=document.getElementById('defRecogs');
	if (recogElem)
		recogElem.innerHTML=PanelClosedHtml('closedRec','OpenRecogs','Recognition Definitions Panel');
	recogsClosed=true;
	window.setTimeout("Sizer()",1);
}

function OpenRecogs()
{
	if (!recogsClosed)
		return;
	recogsClosed=false;
	var recogElem=document.getElementById('defRecogs');
	if (recogElem)
		recogElem.innerHTML=design.screen.GetRecogSettings();
	window.setTimeout("Sizer()",1);
}

function CloseReads()
{
	var readElem=document.getElementById('defReads');
	if (readElem)
		readElem.innerHTML=PanelClosedHtml('closedRead','OpenReads','Read Fields Panel');
	readsClosed=true;
	window.setTimeout("Sizer()",1);
}

function OpenReads()
{
	if (!readsClosed)
		return;
	readsClosed=false;
	var readElem=document.getElementById('defReads');
	if (readElem)
		readElem.innerHTML=design.screen.GetReadSettings();
	window.setTimeout("Sizer()",1);
}

function CloseChanges()
{
	var changeElem=document.getElementById('defChanges');
	if (changeElem)
		changeElem.innerHTML=PanelClosedHtml('closedChg','OpenChanges','Field Changes Definitions Panel');
	changesClosed=true;
	window.setTimeout("Sizer()",1);
}

function OpenChanges()
{
	if (!changesClosed)
		return;
	changesClosed=false;
	var changeElem=document.getElementById('defChanges');
	if (changeElem)
		changeElem.innerHTML=design.screen.GetChangeSettings();
	window.setTimeout("Sizer()",1);
}

function PanelClosedHtml(divId, openFunc, panelTitle)
{
	var t='<div id="'+divId+'" onclick="'+openFunc+'()" style="cursor:pointer;text-align:left;">';
	t+='<img class="thumbImg" src="img/clickdown.gif" title="Click to Display '+panelTitle+'..." />';
	t+='<span style="padding-left:5px;font-size:0.6em;">Click Here to Open '+panelTitle+'...';
	t+='</span></div>';
	return t;
}

function DrawThumbs()
{
	var t = '<img class="thumbImg" style="float:left" onclick="CloseThumbs()" src="img/clickup.gif" title="Click to collapse thumbnail slider" /><br />',
		 s, scn, iconHtml;
	t+='<div style="zoom:1"><div id="thumbs" style="width:500px;overflow:auto;margin-left:20px;">';
	t+='<table cellpadding="0" cellspacing="0"><tr>';
	for(s=0;s<design.screens.length;s++)
	{
		scn=design.screens[s];
		iconHtml=scn.ThumbIconHtml();
		t+='<td><div class="thumb" id="thumb_'+s+'" onclick="ThumbClick('+s+')"><div class="label" id="slbl_'+s+'">'+scn.id+iconHtml+'</div>'+scn.GetHTML('sthmb_'+s,'thumbScn');
		t+='</div></td>';
	}
	t += '<td><div class="thumb" id="thumb_' + s + '" onclick="ThumbClick(' + s + ')"><div class="label" id="slbl_' + s + '">Script Generation</div>';
	
	t+='</div></td>';
	t+='</tr></table></div></div>';
	return t;
}

function SetSizerLoc()
{
	var contentElem=document.getElementById('content');
	design.wizSizerElem.style.left = (contentElem.offsetLeft + 2) + 'px';
	design.wizSizerElem.style.top = (design.wizPropsElem.offsetTop - 4) + 'px';
	design.wizSizerElem.style.width = (contentElem.offsetWidth - 4) + 'px';
}

// Called after wizard page is drawn
function SetThumbsWidth()
{
	if (flow.macs.screensActive && !design.wizThumbsActive)
	{
		if (design.wizThumbsElem.offsetHeight > 20)
		{
			design.wizThumbsElem.innerHTML = PanelClosedHtml('thumbs', 'OpenThumbs', 'Thumbnail Slider');
			window.setTimeout("Sizer()",1);
		}
		return;
	}
	var preElem = document.getElementById('scnHtml'),
		 thumbsElem = document.getElementById('thumbs'),
		 activeWidth, scnInfoElem, width, needsAdjust, s, tElem,
		 leftEdge, rightEdge;
	if (flow.macs.screensActive && !thumbsElem)
		return;
	if (flow.macs.screensActive)
		activeWidth = parseInt(thumbsElem.style.width);
	else if (preElem)
		activeWidth = preElem.offsetWidth + 40;		
	if (preElem)
	{
		scnInfoElem=document.getElementById('scnInfoForm');
		modelScnWidth=preElem.offsetWidth;
		modelScnHeight=preElem.offsetHeight;
		if (scnInfoElem)
			modelScnHeight+=scnInfoElem.offsetHeight;
		width=preElem.offsetWidth+40;
		needsAdjust=(activeWidth!=width);
		if (needsAdjust)
		{
			activeWidth=width;
			thumbsElem.style.width=width+'px';
		}
	}
	if (!flow.macs.screensActive)
		return;
	for(s=0;s<design.screens.length+1;s++)
	{
		tElem=document.getElementById('thumb_'+s);
		if (tElem)
		{
			if (s==design.screenIndex)
			{
				tElem.className='thumbSel';
				leftEdge=(tElem.offsetWidth+4)*s;
				rightEdge=leftEdge+tElem.offsetWidth;
				if (leftEdge<thumbsElem.scrollLeft)
					thumbsElem.scrollLeft=leftEdge-10;
				else if (rightEdge>activeWidth+thumbsElem.scrollLeft)
					thumbsElem.scrollLeft=rightEdge-activeWidth+10;
			}
			else
				tElem.className='thumb';
		}
	}
}

