// Module Pattern for best performance and non-global vars
/// <reference pagh="../Dynwin.js" />
/// <reference path="../MacDesign.js" />
/// <reference path="../Plugin.js" />
/// <reference path="ActionBlock.js" />
/// <reference path="CoreActions.js" />
/// <reference path="ActionDesigner.js" />
(function ()
{
	if (!flow.logic)
		flow.logic = {};

	var imgCache = {},
		 lastImage,
		 imgPath = flow.macs.macUri + 'img/',
		 imagesLoaded,
		 initFormWidth = '40em',
		 wrap = function (json, width, indent)
		 {
		 	var ch, qchar = null, colonAt = -1, commaAt = -1, count = 0, t = '', line = '', i;
		 	for (i = 0; i < json.length; i++)
		 	{
		 		ch = json.charAt(i);
		 		if (qchar)
		 		{
		 			if (ch == qchar)
		 				qchar = null;
		 		}
		 		else if ((ch == '"') ||
						   (ch == '\''))
		 		{
		 			qchar = ch;
		 		}
		 		else if (ch == ',')
		 		{
		 			if (line.length > width)
		 			{
		 				if (commaAt == -1)
		 					commaAt = colonAt;
		 				if (commaAt == -1)
		 				{
		 					t += line + ',\n' + indent;
		 					line = '';
		 					continue;
		 				}
		 				else
		 				{
		 					commaAt++;
		 					t += line.substr(0, commaAt) + '\n' + indent;
		 					line = line.substr(commaAt);
		 				}
		 				colonAt = -1;
		 			}
		 			commaAt = line.length;
		 		}
		 		else if (ch == ':')
		 			colonAt = line.length;

		 		line += ch;
		 	}
		 	return t + line;
		 };

	function DLPreloadImages()
	{
		var i, args = DLPreloadImages.arguments, src, img;
		for (i = 0; i < args.length; i++)
		{
			src = args[i];
			imgCache[src] = img = new Image();
			img.src = 'img/' + src + 'png';
		}
		lastImage = args[args.length - 1];
	}

	function InitDrawLogic(onReady)
	{
		DLPreloadImages('ActionCallJoin', 'ActionFromVar', 'ActionLfCap', 'ActionMid', 'ActionReturn', 'ActionRtCap');
		DLPreloadImages('ActionToExt', 'ActionToVar', 'Contbotend', 'ContBotMid', 'ContClose', 'ContOpen', 'ContVertBar');
		DLPreloadImages('ActionContainer', 'Caller', 'FromExt', 'FromExtReady', 'IteratorAction', 'IteratorUser', 'pluginexp');
		DLPreloadImages('pluginimp', 'Caller', 'FromExt', 'FromExtReady', 'ToVar', 'ToVarReady', 'UIPAction');
		CheckImagesReady(onReady);
	}

	var onCIReady;
	function CheckImagesReady(onReady)
	{
		var logic;
		if (onReady)
			onCIReady = onReady;
		if (imgCache[lastImage])
		{
			imagesLoaded = true;
			onCIReady();
		}
		else
			window.setTimeout('CheckImagesReady()', 200);
	}

	flow.logic.BlanksEdit = function (text, propName)
	{
		if (flow.macs.trim(text) != '')
			return true;
		return 'The ' + propName + ' value cannot be blank!';
	}

	flow.logic.FixupExtList = function (runtime, extList)
	{
		var id, extType;
		for (id in extList)
		{
			extType = extList[id];
			if (extType.propNames)
				continue;
			extType.propNames = {};
			flow.logic.FixupNewActions(runtime, extType.propNames, extType.newActions);
		}
	}

	flow.logic.FixupNewActions = function (runtime, propNames, newActions)
	{
		var i, newAction, actionRef, initProps, id, prop, j, id2;
		for (i = 0; i < newActions.length; i++)
		{
			newAction = newActions[i];
			if (typeof (newAction) == 'string')
			{
				actionRef = runtime.GetAction(newAction);
				newActions[i] = {};
				newActions[i].id = newAction;
				newAction = newActions[i];
			}
			else
				actionRef = runtime.GetAction(newAction.id);

			if (!actionRef)
			{
				alert('Action with ID ' + newAction + ' in Design List but not Registered in WebFlows environment...');
				continue;
			}
			initProps = actionRef.initProps;
			if (initProps)
			{
				for (id in initProps)
				{
					prop = initProps[id];
					if (id.substring(0, 2) == 'e_')
						newAction[id] = prop;
					else if (id == 'newActions')
					{
						if (!newAction.newActions)
							newAction.newActions = [];
						for (j = 0; j < prop.length; j++)
						{
							newAction.newActions.splice(0, 0, prop[j]);
						}
					}
					else if (id == 'propNames')
					{
						for (id2 in prop)
						{
							propNames[id2] = prop[id2];
						}
					}
				}
			}
			if (newAction.newActions)
			{
				propNames.prop$Names = {};
				flow.logic.FixupNewActions(runtime, propNames.prop$Names, newAction.newActions);
			}
		}
	}

	flow.logic.PluginSelector = function (runtime, np, extType, pname, value, propObj, inpIds, imports, exports)
	{
		var t = '', plugins = runtime.GetPluginList(imports, exports), plugin,
			 id = np + 'Txt' + extType + '_' + pname, i, selected = ' selected="selected"';

		inpIds.push(id);
		t += '<label class="medium">' + propObj.text + ': </label>';
		t += '<select title="' + propObj.title + '" id="' + id + '" name="' + id + '" >';
		if (value && value != '')
			selected = null;
		for (i = 0; i < plugins.length; i++)
		{
			plugin = plugins[i].plugin;
			if (!selected)
			{
				if (value == plugin.id)
					selected = ' selected="selected"';
			}
			t += '<option value="' + plugin.id + '"' + selected + '>' + plugin.title + '</option>\n';
			selected = '';
		}
		t += '</select><br />\n';
		return t;
	}

	// Manages the Flow Logic design space
	flow.logic.FlowDesigner = function (htDoc, parent, runtime, design, designTypes, defaultType)
	{
		if (!design)
			return;
		this.design = design;
		this.runtime = runtime;
		this.designTypes = designTypes;
		this.defaultType = defaultType;
		flow.logic.FixupExtList(runtime, designTypes);
		flow.macs.DynWin.call(this, htDoc, parent, true);
		this.runtime.flowDoc = htDoc;
		this.runtime.flowParent = parent;
		this.init('FDMain', "WebFlows Designer Panel");
	}
	flow.logic.FlowDesigner.prototype = new flow.macs.DynWin();
	var FDPROT = flow.logic.FlowDesigner.prototype; //convenience
	FDPROT.constructor = flow.logic.FlowDesigner;

	FDPROT.GenCode = function ()
	{
		var t = 'var macro=this;\n',
			 i, pluginInitLines;
		this.mainLogic.actionBlock.SaveDesign(this.design);
		// Future callable this.workLogic.actionBlock.SaveDesign(this.design);
		this.design.wizGenRestart = ((this.design.screens.length > 0) && (this.design.screens[0].id == this.design.screens[this.design.screens.length - 1].id));
		// Future callable t += flow.logic.GenBlocks([this.mainLogic.actionBlock, this.workLogic.actionBlock]);
		t += flow.logic.GenBlocks([this.mainLogic.actionBlock]);
		pluginInitLines = this.design.GetDesignerConstructors();
		if (pluginInitLines &&
			 (pluginInitLines.length > 0))
		{
			t += '// Plugin Constructor Code:\n';
			for (i = 0; i < pluginInitLines.length; i++)
			{
				t += '  ' + pluginInitLines[i] + '\n';
			}
		}
		t += '// Screen Recognition Definitions\n';
		t += this.design.screenRecogs;
		t += "// Parameter/field values and prompting options\n";
		t += this.GetMacParmDefs();
		return t;
	}

	FDPROT.GetMacParmDefs = function ()
	{
		var t = 'this.runtime.ParameterInfo={\n "legend":"Macro Parameters",\n "varsMeta":{\n',
		 varRefs = this.mainLogic.actionBlock.GetVarRefs('gen');
		t += this.GetParmDefs2(varRefs, '  ');
		t += '\n  }\n};\n';
		return t;
	}

	FDPROT.GetParmDefs2 = function (varRefs, indent)
	{
		var t = '',
			 needComma = false, i, varRef, j, field,
			 r, f, read, found, field, pt, IsPassword, propName, prop,
			 c, fields = [], JSON = this.design.JSON;

		for (i = 0; i < varRefs.length; i++)
		{
			varRef = varRefs[i];
			found = false;
			for (j = 0; j < fields.length; j++)
			{
				if (fields[j].name == varRef.name)
				{
					found = true;
					break;
				}
			}
			if (!found)
				fields.push(varRef);
		}

		for (i = 0; i < fields.length; i++)
		{
			field = fields[i];
			if (!field.type ||
			 (field.type != 'read'))
			{
				if (!field.label)
					field.label = field.name;
				if (!field.title)
					field.title = field.name;
			}
			if (needComma)
				t += ',\n';
			else
				needComma = true;
			pt = '';
			IsPassword = false;
			for (propName in field)
			{
				prop = field[propName];
				switch (propName)
				{
					case 'source':
					case 'prompt':
					case 'offset':
					case 'row':
					case 'col':
					case 'len':
					case 'id':
					case 'mergeable':
					case 'text':
					case 'linked':
					case 'val':
					case 'toJSON':
					case 'name': //redundant
					case 'scnNumId':
					case 'type':
						break;
					case 'pw':
						if (prop)
						{
							IsPassword = true;
							pt += ',"type":"password"';
						}
						break;
					case 'children':
						indent += '  ';
						pt += ',\n' + indent + '"varsMeta":\n' + indent + ' {\n' + this.GetParmDefs2(prop, indent + '  ') + '\n' + indent + ' }';
						indent = indent.substring(2);
						break;
					default:
						if (typeof (prop) == 'object')
						{
							pt += ',\n' + indent + '    "' + propName + '":' + wrap(JSON.stringify(prop), 60, indent + '\t\t');
						}
						else
						{
							if ((prop == 'label') ||
						    (prop == 'title'))
							{
								if (field.source != 'user')
									break;
							}
							pt += ',\n' + indent + '    "' + propName + '":"' + prop + '"';
						}
						break;
				}
			}
			t += indent + '"' + field.name + '":\n' + indent + ' {\n' + indent + '  "val":"' + ((field.val) ? field.val : '') + '","prompt":' + ((field.source == 'user') ? 'true' : 'false') + pt + '\n' + indent + ' }';
		}
		return t;
	}

	FDPROT.Display = function ()
	{
		var me = this,
			 leftMargin = Math.floor(this.width / 8),
			 editorWidth = this.width - leftMargin - 8,
			 mainTop = 20,
			 mainHeight = Math.floor(this.height - 25);
		/* For future support of procedures
		mainHeight = Math.floor(this.height * 0.5),
		workTop = mainTop + mainHeight + 15,
		workHeight = this.height - workTop - 8;
		*/
		if (!imagesLoaded)
		{
			InitDrawLogic(function () { me.Display() });
			return;
		}
		this.elem.style.height = this.height + 'px';
		this.elem.style.width = this.width + 'px';
		this.titleElem = this.NewDiv('title', 'title', this.elem, this.title);
		this.titleElem.style.top = '0px';
		this.Center(this.titleElem);
		this.mHeaderElem = this.NewDiv('mhead', 'header', this.elem, 'Main Macro Logic');
		this.mHeaderElem.style.top = (mainTop - 12) + 'px';
		this.mHeaderElem.style.left = (leftMargin + 2) + 'px';
		this.mainLogic = new flow.logic.ActionBlockDesigner(this.htDoc, 'ml', this.elem, this.runtime, true, this.design, "Main");
		this.mainLogic.displayOnly = true;
		this.mainLogic.elem.style.left = leftMargin + 'px';
		this.mainLogic.elem.style.top = mainTop + 'px';
		this.mainLogic.width = editorWidth;
		this.mainLogic.height = mainHeight;
		this.elem.style.visibility = 'visible';
		this.mainLogic.Draw();

		this.mainEditElem = this.NewImage('me', 'img/edit.png', 18, 18, 'actions', this.elem);
		this.mainEditElem.style.top = mainTop + 'px';
		this.mainEditElem.style.left = (leftMargin - 20) + 'px';
		this.mainEditElem.style.cursor = 'pointer';
		this.mainEditElem.onclick = function () { me.EditMain() };

		/* Future Support for Callable Procedures
		this.wHeaderElem = this.NewDiv('phead', 'header', this.elem, 'Procedures (Work) Logic');
		this.wHeaderElem.style.top = (workTop - 12) + 'px';
		this.wHeaderElem.style.left = (leftMargin + 2) + 'px';
		this.workLogic = new flow.logic.ActionBlockDesigner(this.htDoc, 'wl', this.elem, this.runtime, true, this.design, "Work");
		this.workLogic.displayOnly = true;
		this.workLogic.elem.style.left = leftMargin + 'px';
		this.workLogic.elem.style.top = workTop + 'px';
		this.workLogic.width = editorWidth;
		this.workLogic.height = workHeight;
		this.workLogic.Draw();

		this.workEditElem = this.NewImage('me', 'img/edit.png', 18, 18, 'actions', this.elem);
		this.workEditElem.style.top = workTop + 'px';
		this.workEditElem.style.left = (leftMargin - 20) + 'px';
		this.workEditElem.style.cursor = 'pointer';
		this.workEditElem.onclick = function () { me.EditWork() };
		*/
		if (!this.design.actionBlocks || !this.design.actionBlocks.Main || (this.design.actionBlocks.Main.design.children.length == 0))
		{
			var fi = new flow.logic.FlowInitialize(this.htDoc, this.elem, this.runtime, this.design, this.designTypes, this.defaultType);
			fi.Display(function (obj, msg) { me.Initialize(obj, msg) });
		}
	}

	/* Future Support for Callable Procedures 
	FDPROT.EditWork = function ()
	{
	var me = this;
	this.workEditor = new flow.logic.ActionBlockDesigner(this.htDoc, 'mledit', this.elem, this.runtime, false, this.design, this.workLogic.actionBlock,
	function (actionBlock, msg)
	{
	if (msg == 'ok')
	{
	me.workLogic.actionBlock = actionBlock;
	me.workLogic.Draw();
	}
	});
	this.workEditor.Draw();
	}
	*/

	FDPROT.EditMain = function ()
	{
		var me = this;
		this.mainEditor = new flow.logic.ActionBlockDesigner(this.htDoc, 'mledit', this.elem, this.runtime, false, this.design, this.mainLogic.actionBlock,
				function (actionBlock, msg)
				{
					if (msg == 'ok')
					{
						me.mainLogic.actionBlock = actionBlock;
						me.mainLogic.Draw();
					}
				});
		this.mainEditor.Draw();
	}

	FDPROT.Initialize = function (initObj, msg)
	{
		if (msg == 'ok')
		{
			if (initObj.mainBlock)
			{
				this.mainLogic.actionBlock = initObj.mainBlock;
				this.mainLogic.actionBlock.SaveDesign(this.design);
				this.mainLogic.Draw();
			}
			if (initObj.workBlock)
			{
				this.workLogic.actionBlock = initObj.workBlock;
				this.workLogic.actionBlock.SaveDesign(this.design);
				this.workLogic.Draw();
			}
		}
	}

	// Manages the Flow Logic design space
	flow.logic.FlowInitialize = function (htDoc, parent, runtime, design, designTypes, defaultType)
	{
		if (!design)
			return;
		this.design = design;
		this.runtime = runtime;
		this.extTypeList = designTypes;
		this.extType = defaultType;
		flow.macs.DynWin.call(this, htDoc, parent);
		this.extProps = {};
		this.np = 'fi';
		this.init('FDInit', "WebFlows Designer Startup Options");
		flow.nextZIndex = 100;
	}
	flow.logic.FlowInitialize.prototype = new flow.macs.DynWin();
	var FIPROT = flow.logic.FlowInitialize.prototype; //convenience
	FIPROT.constructor = flow.logic.FlowInitialize;

	FIPROT.Display = function (onClose)
	{
		var me = this;
		this.onClose = onClose;
		this.titleElem = this.NewDiv('title', 'title', this.elem, this.title);
		this.CreateTopElem(this.np);
		this.GenDetailsElem(this.np, false, this.extTypeList[this.extType], initFormWidth);
		this.actionsElem = this.NewDiv('actions', 'actions', this.elem);
		this.okBtn = this.NewButton('okBtn', 'OK', this.actionsElem);
		this.okBtn.onclick = function () { me.OKClick() };
		this.cancelBtn = this.NewButton('canBtn', 'Cancel', this.actionsElem);
		this.cancelBtn.onclick = function () { me.BtnAction('cancel') };
		this.Resize();
	}

	FIPROT.PluginImportSelect = function (np, pname, propObj, inpIds)
	{
		return this.PluginSelect(np, pname, propObj, inpIds, true, false);
	}

	FIPROT.PluginExportSelect = function (np, pname, propObj, inpIds)
	{
		return this.PluginSelect(np, pname, propObj, inpIds, false, true);
	}

	FIPROT.PluginSelect = function (np, pname, propObj, inpIds, imp, exp)
	{
		var value = this.GetExtPropVal(this.extType + '_' + pname, propObj.defaultValue);
		return flow.logic.PluginSelector(this.runtime, np, this.extType, pname, value, propObj, inpIds, imp, exp);
	}

	FIPROT.OKClick = function ()
	{
		var designDef = this.extTypeList[this.extType],
			 block = new flow.logic.ActionBlock(this.runtime, "Main");
		this.mainBlock = block;
		this.GetExtPropsValues(designDef, this.extProps);
		this.FixupValues(designDef.newActions);
		this.GenActions(block, designDef.newActions, designDef.propNames);
		this.BtnAction('ok', this);
	}

	FIPROT.GenActions = function (block, newActions)
	{
		var i;
		for (i = 0; i < newActions.length; i++)
		{
			block.AddAction(newActions[i]);
		}
	}

	FIPROT.CreateTopElem = function (np)
	{
		var me = this, formElem,
			t = '<form class="pform" action="#" style="width:' + initFormWidth + ';min-width:' + initFormWidth + ';" method="post" id="' + np + 'form" name="' + np + 'pform">';
		t += this.GenTypeSelection(np, this.extTypeList, "Starting Logic", 1);
		t += '</form>';
		this.topElem = this.NewDiv(np + 'Top', 'userInput', this.elem, t);
		formElem = this.getById(np + 'form');
		if (formElem)
			formElem.onkeydown = function (event) { me.CheckEnterKey(event || window.event) };
		try { this.getById(np + 'RB' + this.extType).focus(); } catch (e) { }
		this.SetTypeSelection(np, this.extTypeList);
	}

	FIPROT.Resize = function ()
	{
		this.height = this.width = 0;
		this.SetLocation(this.titleElem, 0, 5);
		this.SetLocation(this.topElem, 0, 5);
		if (this.detailsElem)
		{
			this.detailsElem.style.visibility = 'visible';
			this.SetLocation(this.detailsElem, 0, 5);
		}
		if (this.actionsElem)
			this.SetLocation(this.actionsElem, 0, 5);
		this.width += 8;
		this.Center(this.titleElem);
		if (this.actionsElem)
			this.Center(this.actionsElem);
		this.Show(this.onClose);
	}

	if (typeof (fvmCtl) != 'undefined')
	{
		fvmCtl.fvm.AddPlugin(flow.logic.FlowDesigner, 'design', 'FlowDesigner');
	}
	else
		alert('Flow Designer Plugins Loaded but no Macro Control object to bind to...');
} ());
