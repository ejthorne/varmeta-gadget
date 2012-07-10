// Module Pattern for best performance and non-global vars
/// <reference path="../SCMacros.js" />
/// <reference path="../DynWin.js" />
/// <reference path="../ScreenInfo.js" />
/// <reference path="../MacDesign.js" />
/// <reference path="../FlowEdit.js" />
/// <reference path="../MacrosMgr.htm" />
/// <reference path="../DragMgr.js" />
/// <reference path="../Plugin.js" />
/// <reference path="XlsData.js" />
(function ()
{
	if (!flow.xls)
		flow.xls = {};
	//-------------------------XlsDesigner Class -----------------------------
	// XlsDesigner inherits from PluginDesigner (a DynWin child)
	flow.macs.XlsDesigner = function (owner, htDoc, parent, instanceId, design, extIsTarget)
	{
		flow.macs.PluginDesigner.call(this, owner, htDoc, parent, instanceId, design, extIsTarget, 'PC');
		this.init('dm_driver', "Microsoft Excel Data " + ((extIsTarget) ? "Writer" : "Reader") + " Options", false, 600);
		this.LocalInit();
	}
	flow.macs.XlsDesigner.prototype = new flow.macs.PluginDesigner();
	var XDPROT = flow.macs.XlsDesigner.prototype; // convenience
	XDPROT.constructor = flow.macs.XlsDesigner;

	XDPROT.LocalInit = function ()
	{
		this.IsMultiRow = false;
		this.startRWRow = 2;
		this.startRWCol = 'B';
		this.docPathName = (this.extIsTarget) ? 'XlsWritePath' : 'XlsReadPath';
		this.docLabel = (this.extIsTarget) ? 'Excel Target File' : 'Excel Source File';
		this.extPropName = (this.extIsTarget) ? 'ext$XlsWriter' : 'ext$XlsReader';
		if (this.extIsTarget)
		{
			this.matchPoolTitle = "Macro Variables";
			this.matchTargTitle = "Excel Targets";
		}
		else
		{
			this.matchPoolTitle = "Excel Sources";
			this.matchTargTitle = "Macro Variables";
		}
		this.matchSetExtStyle = function (ext) { ext.elem.style.backgroundColor = 'black'; ext.elem.style.color = 'white' };
		this.matchSetVarStyle = function (varRef) { varRef.elem.style.backgroundColor = '#9999ff'; varRef.elem.style.color = 'black' };
		this.serverFolder = 'XlsData';
	}

	XDPROT.GenCode = function (phase)
	{
		if (phase == 'Exec')
		{
			var lines = new Array();
			if (this.extIsTarget)
			{
				lines.push('macro.plugins.xlsData.OpenWriteDoc(this.vars.' + this.GetDocPathName() + ',true);');
				lines.push('macro.plugins.xlsData.WriteToXlsCells(this.vars, this.varsMeta,"' + this.GetExtPropName() + '");');
			}
			else
			{
				lines.push('macro.plugins.xlsData.OpenReadDoc(this.vars.' + this.GetDocPathName() + ',false);');
				lines.push('macro.plugins.xlsData.ReadFromXlsCells(this.vars,this.varsMeta,"' + this.GetExtPropName() + '");');
				lines.push('macro.plugins.xlsData.CloseReadDoc();');
			}
			return { "lines": lines };
		}
		return null;
	}


	XDPROT.MergeElemExtra = function (mergeElem)
	{
		var me = this,
		  t = '',
		  nrElem, hdElem, lbElem;
		t += '<input name="nameopts" type="radio" id="namesRad" />Define during Match&nbsp;';
		t += '<input name="nameopts" type="radio" id="hdrsRad" />Use Row1 Headers (Rows Array)&nbsp;';
		t += '<input name="nameopts" type="radio" id="lblsRad" />Use Col 1 Labels (Columns Array)&nbsp;';
		this.optsElem = this.NewDiv('docopts', null, mergeElem, t);
		nrElem = this.getById('namesRad');
		if (nrElem)
		{
			if (!me.data.headerNames && !me.data.labelNames)
				nrElem.checked = true;
			nrElem.onclick = function () { me.data.headerNames = me.data.labelNames = false; };
		}
		hdElem = this.getById('hdrsRad');
		if (hdElem)
		{
			if (me.data.headerNames)
				hdElem.checked = true;
			hdElem.onclick = function () { me.data.headerNames = true; me.data.labelNames = false; };
		}
		lbElem = this.getById('lblsRad');
		if (lbElem)
		{
			if (me.data.labelNames)
				lbElem.checked = true;
			lbElem.onclick = function () { me.data.headerNames = false; me.data.labelNames = true; };
		}
	}

	XDPROT.GetMatchExtDefs = function ()
	{
		var extDefs = [], oXLS, cellNames, i, cellName, headerNames, colLabels,
			 rowsDef, rowsArr, colsDef, colsArr, name;
		if (this.extIsTarget)
			oXLS = this.owner.OpenWriteDoc(this.data.activeDoc, false);
		else
			oXLS = this.owner.OpenReadDoc(this.data.activeDoc, true);
		cellNames = this.owner.GetXlsCellNames(oXLS);
		if (cellNames)
		{
			for (i = 0; i < cellNames.length; i++)
			{
				extDefs.push(cellNames[i]);
			}
		}
		if (this.data.headerNames)
		{
			name = 'Rows' + this.startRWRow + 'toEnd';
			rowsArr = [];
			rowsDef = { 'name': name,
				'ext$Props':
							{
								'name': name,
								'type': 'MultiRow',
								'metaSource': 'RowHeaders',
								'startRow': this.startRWRow,
								'endRow': 'allBlank'
							},
				'nameType': 'FromHeaders',
				'children': rowsArr
			};
			headerNames = this.owner.GetXlsRowHeaders(this.extIsTarget);
			for (i = 0; i < headerNames.length; i++)
			{
				rowsArr.push(headerNames[i]);
			}
			extDefs.push(rowsDef);
		}
		if (this.data.labelNames)
		{
			name = 'Cols' + this.startRWCol + 'toEnd';
			colsArr = [];
			colsDef = { 'name': name,
				'ext$Props':
							{
								'name': name,
								'type': 'MultiCol',
								'metaSource': 'ColLabels',
								'startCol': this.startRWCol,
								'endCol': 'allBlank'
							},
				'nameType': 'FromLabels',
				'children': colsArr
			};
			colLabels = this.owner.GetXlsColLabels(this.extIsTarget);
			for (i = 0; i < colLabels.length; i++)
			{
				colsArr.push(colLabels[i]);
			}
			extDefs.push(colsDef);
		}
		return extDefs;
	}

	XDPROT.SetMatchingEvents = function (fmObj)
	{
		var me = this, NPWindow;
		this.SetNewVarRef(fmObj);
		this.SetMissingMatch(fmObj, flow.xls.xlsExtTypeList);

		fmObj.onNewExtRef = function (extDef, varRef, onClose, existingExt)
		{
			NPWindow = new flow.macs.XlsNewExt(me, extDef, varRef, existingExt, this.extIsTarget);
			NPWindow.Display(onClose);
		};
	}

	XDPROT.Display = function (editor)
	{
		var me = this;
		this.editor = editor;
		var activeDoc = (this.data.activeDoc) ? this.data.activeDoc : "none...";
		this.NewDesignerForm(this.elem);
		this.fileElem = this.NewFilePrompt(this.designerForm, activeDoc, "40em", this.data.activeFileType, true);
		this.CheckForMerging();
		this.Resize(true);
		return this.elem;
	}

	XDPROT.Resize = function (creating)
	{
		this.height = this.width = 0;
		this.SetLocation(this.designerForm, 0, 0);
		this.SetLocation(this.fileElem, 5, 5);
		if (this.mergeElem)
			this.SetLocation(this.mergeElem, 0, 5);
		this.width += 3;
		this.Show();
		if (!creating && this.editor)
			this.editor.Resize();
	}

	XDPROT.FinishDesigner = function (ok)
	{
		if (ok)
		{
			if (!this.data.IsMatched ||
					(this.data.matchDoc != this.data.activeDoc))
			{
				alert('You need to match the fields for the most recently selected Excel file...');
				return;
			}
			this.data.promptForDoc = this.FilePromptIsChecked();
			if (this.fmObj)
				this.fmObj.LinkMatches();
			this.BtnAction('ok');
		}
	}

	XDPROT.CheckDoc = function (callBack)
	{
		var ok = true;
		if (this.data.activeDoc == null)
		{
			alert('You need to select a Valid Excel File and then use the Field Name Match action before clicking OK...');
			ok = false;
		}

		if (ok &&
			 (this.data.validatedDoc != this.data.activeDoc))
		{
			var oXLS = null;
			try
			{
				oXLS = this.owner.OpenDoc(this.data.activeDoc, this.extIsTarget);
				if (!oXLS.ActiveSheet)
				{
					alert('You file currently selected is not a valid Excel document...');
					ok = false;
				}
				else
				{
					var namesCount = oXLS.Names.Count;
					if (namesCount > 0)
					{
						this.data.xlsNames = this.owner.GetXlsCellNames(oXLS);
						this.data.docFieldCount = this.data.xlsNames.length;
					}
					else
					{
						this.data.docFieldCount = 0;
						this.data.xlsNames = null;
					}
				}
			}
			catch (e)
			{
				alert('Exception opening selected Excel File "' + this.data.activeDoc + '": ' + e.message);
				ok = false;
			}
			finally
			{
				if (oXLS)
					this.owner.CloseDoc(this.extIsTarget);
			}
			this.data.validatedDoc = this.data.activeDoc;
		}
		if (callBack)
			callBack(ok);
		return ok;
	}

	//-------------------- NewXlsExt Class
	flow.macs.XlsNewExt = function (xlsDesigner, extRef, varRef, existingExt,
													extIsTarget, asChild, id, title, xlsExtTypeList)
	{
		if (!xlsDesigner)
			return;
		var parent = xlsDesigner.fmObj.elem;
		this.xlsDesigner = xlsDesigner;
		flow.macs.DynWin.call(this, xlsDesigner.htDoc, parent, asChild);
		this.extIsTarget = (extIsTarget);
		this.extPropName = xlsDesigner.GetExtPropName();
		if (xlsExtTypeList)
			this.extTypeList = xlsExtTypeList;
		else
			this.extTypeList = flow.xls.xlsExtTypeList;
		this.SetExtValues(extRef, varRef, existingExt, title);
		if (varRef && !this.existingExt)
		{
			if (varRef.type == "*add")
				this.allTypesOK = true;
			else
			{
				this.allTypesOK = false;
				this.hasChildren = (varRef.hasChildren) ? true : false;
			}
		}
		this.np = 'xe';
		if (!id)
			id = 'Xls_NewExt';
		this.asChild = asChild;
		this.modal = (asChild) ? false : true;
		this.init(id, this.title, this.modal, this.GetNewZIndex(parent));
		this.runtime = xlsDesigner.runtime;
	}
	flow.macs.XlsNewExt.prototype = new flow.macs.DynWin();
	var XEPROT = flow.macs.XlsNewExt.prototype; //convenience
	XEPROT.constructor = flow.macs.XlsNewExt;

	XEPROT.SetExtValues = function (extRef, varRef, existingExt, title)
	{
		var propName, existingProps, basePropName;
		this.extRef = extRef;
		this.varRef = varRef;
		this.existingExt = existingExt;
		this.extProps = {};
		if (this.existingExt)
		{
			this.allTypesOK = false;
			this.hasChildren = (this.existingExt.hasChildren);
			existingProps = this.existingExt.ext$Props;
			this.extType = existingProps.type;
			this.immutable = (existingProps.immutable);
			if (!this.immutable)
			{
				for (propName in existingProps)
				{
					if (typeof (existingProps[propName]) == 'function')
						continue;
					this.extProps[this.extType + '_' + propName] = existingProps[propName];
				}
			}
		}
		else
		{
			this.immutable = false;
			this.allTypesOK = true;
		}
		if (!title)
		{
			var matchDesc = (varRef) ? 'Matched to ' + varRef.name : 'Not Currently Matched';
			if (existingExt)
				title = 'Update the Excel Data Reference ' + existingExt.name + ' ' + matchDesc;
			else
				title = 'Define a new Excel Data Reference ' + matchDesc;
			this.title = title;
		}
		else
			this.title = title;
	}

	XEPROT.OKClick = function ()
	{
		var newExt = new Object, extObj = this.extTypeList[this.extType], pname, propObj,
			 extProp = {}, elem;

		// Validate First...
		if (!this.immutable)
		{
			if (!this.ExtObjValidation(extObj))
				return;
		}

		newExt.type = extProp.type = this.extType;
		newExt.name = extProp.name = flow.macs.FieldNameFromLabel(this.getById(this.np + 'ExtName', 'value'));
		newExt.ext$Props = extProp;
		extProp.dynamicDef = true;
		if (this.immutable)
		{
			extProp.immutable = true; // will suppress copying on outside...
		}
		else
		{
			this.GetExtPropsValues(extObj, extProp);
			if (extObj.hasChildren)
			{
				extProp.hasChildren = newExt.hasChildren = true;
				if (extObj.newChildrenFunc)
				{
					newExt.children = extObj.newChildrenFunc(extProp);
					extProp.holdNewExt = true;
				}
				else
					newExt.children = [];
			}
		}
		this.BtnAction('ok', newExt);
	}

	XEPROT.Display = function (onClose)
	{
		var me = this, t, name, value, formElem, rbUserElem, rbConstElem, rbScreenElem;
		this.onClose = onClose;
		this.titleElem = this.NewDiv('title', 'title', this.elem, this.title);
		if (this.existingExt)
			name = this.existingExt.name;
		else
			name = this.varRef.name;
		this.CreateTopElem(this.np, 'Name', name);
		if (!this.immutable)
			this.GenDetailsElem(this.np, true, this.extTypeList[this.extType], null, this.varRef);
		if (!this.asChild)
		{
			this.actionsElem = this.NewDiv('actions', 'actions', this.elem);
			this.okBtn = this.NewButton('okBtn', 'OK', this.actionsElem);
			this.okBtn.onclick = function () { me.OKClick() };
			this.cancelBtn = this.NewButton('canBtn', 'Cancel', this.actionsElem);
			this.cancelBtn.onclick = function () { me.BtnAction('cancel') };
		}
		this.Resize();
	}

	XEPROT.CreateTopElem = function (np, nameLabel, name)
	{
		var me = this, formElem, xlsExtTypeList = this.extTypeList,
			t = '<form class="pform" action="#" style="width:30em;min-width:35em;" method="post" id="' + np + 'form" name="' + np + 'pform">';
		t += '<label class="medium">' + nameLabel + ': </label>';
		t += '<input type="text" name="' + np + 'ExtName" id="' + np + 'ExtName" style="width:15em" value="' + name + '" /><br />\n';
		t += this.GenTypeSelection(np, xlsExtTypeList, ((this.extIsTarget) ? 'Write' : 'Read'));
		t += '</form>';
		this.topElem = this.NewDiv(np + 'Top', 'userInput', this.elem, t);
		formElem = this.getById(np + 'form');
		if (formElem)
			formElem.onkeydown = function (event) { me.CheckEnterKey(event || window.event) };
		try { this.getById(np + 'ExtName').focus(); } catch (e) { }
		this.SetTypeSelection(np, xlsExtTypeList);
	}

	XEPROT.Resize = function ()
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

} ());
