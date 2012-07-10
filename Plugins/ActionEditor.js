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
	var initFormWidth = '40em';

	// Manages a new/edit Action - if Action is string, it is the actionId
	flow.logic.ActionEditor = function (action, htDoc, parent, runtime, design, container)
	{
		var title = null,
			 id, getFunc;
		if (!action)
			return;
		if (typeof (action) == 'object')
		{
			this.actionId = action.id;
			this.action = action;
			this.creating = false;
			this.container = action.container;
			title = action.name;
		}
		else
		{
			this.actionId = action;
			this.container = container;
			this.creating = true;
		}
		this.actionRef = runtime.GetAction(this.actionId);
		this.extType = this.actionId;
		if (title == null)
			title = this.actionRef.title;
		this.runtime = runtime;
		this.design = design;
		this.extObj = this.actionRef.initProps;
		this.extObj.id = this.actionRef.id; // a little fixup
		flow.macs.DynWin.call(this, htDoc, parent);
		this.extProps = {};
		this.np = 'ae';
		this.init('AE_' + this.actionId, ((this.creating) ? "Create " : "Edit ") + this.actionRef.title, true, this.GetNewZIndex(parent));
		if (!this.creating)
		{
			this.SetExtPropVal('e_name', action.name);
			for (id in this.extObj)
			{
				if (id.substring(0, 2) == 'e_')
				{
					getFunc = 'Get' + id.substring(2);
					if (action[getFunc])
						this.SetExtPropVal(id, action[getFunc]());
				}
			}
			this.designer = action.GetDesigner(htDoc, this.elem);
		}
	}
	flow.logic.ActionEditor.prototype = new flow.macs.DynWin();
	var AEPROT = flow.logic.ActionEditor.prototype; //convenience
	AEPROT.constructor = flow.logic.ActionEditor;

	AEPROT.Display = function (onClose)
	{
		var me = this;
		this.onClose = onClose;
		this.titleElem = this.NewDiv('title', 'title', this.elem, this.title);
		this.GenDetailsElem(this.np, false, this.extObj, initFormWidth);
		if (!this.creating && this.designer)
		{
			this.designerElem = this.designer.Display(this);
		}
		this.actionsElem = this.NewDiv('actions', 'actions', this.elem);
		this.okBtn = this.NewButton('okBtn', 'OK', this.actionsElem);
		this.okBtn.onclick = function () { me.OKClick() };
		this.cancelBtn = this.NewButton('canBtn', 'Cancel', this.actionsElem);
		this.cancelBtn.onclick = function () { me.BtnAction('cancel') };
		this.Resize();
	}

	AEPROT.PluginImportSelect = function (np, pname, propObj, inpIds)
	{
		return this.PluginSelect(np, pname, propObj, inpIds, true, false);
	}

	AEPROT.PluginExportSelect = function (np, pname, propObj, inpIds)
	{
		return this.PluginSelect(np, pname, propObj, inpIds, false, true);
	}

	AEPROT.PluginSelect = function (np, pname, propObj, inpIds, imp, exp)
	{
		var value = this.GetExtPropVal(this.extType + '_' + pname, propObj.defaultValue);
		return flow.logic.PluginSelector(this.runtime, np, this.extType, pname, value, propObj, inpIds, imp, exp);
	}

	AEPROT.WorkProcSelect = function (np, pname, propObj, inpIds)
	{
		var t = '', procs = this.design.GetActionsData('Work', 'Callable'), proc,
			 id = np + 'Txt' + this.extType + '_' + pname,
			 value = this.GetExtPropVal(id, propObj.defaultValue),
			 i, selected = ' selected="selected"';

		inpIds.push(id);
		t += '<label class="medium">' + propObj.text + ': </label>';
		t += '<select title="' + propObj.title + '" id="' + id + '" name="' + id + '" >';
		if (value && value != '')
			selected = null;
		for (i = 0; i < procs.length; i++)
		{
			proc = procs[i].plugin;
			if (!selected)
			{
				if (value == proc.name)
					selected = ' selected="selected"';
			}
			t += '<option value="' + proc.name + '"' + selected + '>' + proc.name + '</option>\n';
			selected = '';
		}
		t += '</select><br />\n';
		return t;
	}


	AEPROT.OKClick = function ()
	{
		var initProps = this.extObj;
		this.GetExtPropsValues(initProps, this.extProps);
		this.FixupValues([initProps]);

		if (this.creating)
			this.action = this.container.AddAction(initProps);
		else
		{
			if (this.action.SetName)
				this.action.SetName(initProps.name);
			else
				this.action.name = initProps.name;
			for (propId in initProps)
			{
				if (this.action['Set' + propId])
					this.action['Set' + propId](initProps[propId]);
			}
			if (this.action.designer)
			{
				if (this.action.designer.OKClick)
					this.action.designer.OKClick();
				this.action.designer.UpdateMacVars(this.action);
				this.design.PluginUpdate(this.action.designer);
			}
		}
		this.BtnAction('ok', this);
	}

	AEPROT.Resize = function ()
	{
		this.height = this.width = 0;
		this.SetLocation(this.titleElem, 0, 5);
		if (this.detailsElem)
		{
			this.detailsElem.style.visibility = 'visible';
			this.SetLocation(this.detailsElem, 0, 5);
		}
		if (this.designerElem)
			this.SetLocation(this.designerElem, 0, 5);
		if (this.actionsElem)
			this.SetLocation(this.actionsElem, 0, 5);
		this.width += 8;
		this.Center(this.titleElem);
		if (this.actionsElem)
			this.Center(this.actionsElem);
		this.Show(this.onClose);
	}

	//-------------------------ActStubDesigner Class -----------------------------
	flow.logic.ActStubDesigner = function (owner, htDoc, parent, instanceId, design, extIsTarget)
	{
		var id, getFunc;
		flow.macs.PluginDesigner.call(this, owner, htDoc, parent, instanceId, design, extIsTarget, 'none');
		this.extTypeList = owner.extTypeList;
		this.extType = owner.extType;
		this.extObj = this.extTypeList[this.extType];
		this.init('em_driver', owner.name + "Designer", false, 600);
		this.extProps = {};
		if (owner.extPropName)
			this.extPropName = owner.extPropName;
		for (id in this.extObj.propNames)
		{
			getFunc = 'Get' + id;
			if (owner[getFunc])
				this.SetExtPropVal(id, owner[getFunc]());
		}
		this.np = 'as';
	}

	// ActStubDesigner inherits from PluginDesigner (a DynWin child)
	flow.logic.ActStubDesigner.prototype = new flow.macs.PluginDesigner();
	var ASPROT = flow.logic.ActStubDesigner.prototype; // convenience
	ASPROT.constructor = flow.logic.ActStubDesigner;

	ASPROT.GetMatchExtDefs = function ()
	{
		return this.owner.GetMatchExtDefs();
	}

	ASPROT.GetVarRefs = function ()
	{
		if (this.owner.GetMatchVarRefs)
			return this.owner.GetMatchVarRefs();
		else
			this.action.container.GetVarRefs('match');
	}

	ASPROT.Display = function (editor)
	{
		var me = this;
		this.editor = editor;
		this.NewDesignerForm(this.elem);
		this.CreateTopElem(this.np, 'Name', name);
		this.GenDetailsElem(this.np, true, this.extTypeList[this.extType], null, this.varRef);
		this.ShowMerge();
		this.Resize(true);
		return this.elem;
	}

	ASPROT.OKClick = function ()
	{
		var initProps = this.extObj;
		this.GetExtPropsValues(initProps, this.extProps);

		for (propId in initProps)
		{
			if (this.owner['Set' + propId])
				this.owner['Set' + propId](initProps[propId]);
		}
	}

	ASPROT.CreateTopElem = function (np)
	{
		var me = this, formElem,
			t = '<form class="pform" action="#" style="width:' + initFormWidth + ';min-width:' + initFormWidth + ';" method="post" id="' + np + 'form" name="' + np + 'pform">',
			rbElem;
		t += this.GenTypeSelection(np, this.extTypeList, "Logic Style", 1);
		t += '</form>';
		this.topElem = this.NewDiv(np + 'Top', 'userInput', this.elem, t);
		formElem = this.getById(np + 'form');
		if (formElem)
			formElem.onkeydown = function (event) { me.CheckEnterKey(event || window.event) };
		rbElem = this.getById(np + 'RB' + this.extType);
		if (rbElem) // might not be there if only one type...
		{
			try { this.getById(np + 'RB' + this.extType).focus(); } catch (e) { }
		}
		this.SetTypeSelection(np, this.extTypeList);
	}

	ASPROT.ShowMerge = function (fromInit)
	{
		var me = this;
		if (!this.mergeElem)
			this.mergeElem = this.NewDiv('mergeinfo', 'userInput', this.designerForm);
		else
			this.mergeElem.innerHTML = '';
		this.mergeElem.style.width = initFormWidth;
		this.matchBtn = this.NewDiv('matchBtn', 'matchText', this.mergeElem, '<span>To Define the Input and Matches, Click to Match Data Context in this Action:</span> <img src="img/ToVar.png"/>');
		this.matchBtn.onclick = function () { me.OpenMatch() };
		if (!fromInit)
			this.Resize();
	}

	ASPROT.Resize = function (creating)
	{
		this.height = this.width = 0;
		this.SetLocation(this.designerForm, 0, 0);
		this.SetLocation(this.topElem, 0, 5);
		if (this.detailsElem)
		{
			this.detailsElem.style.visibility = 'visible';
			this.SetLocation(this.detailsElem, 0, 5);
		}
		if (this.mergeElem)
		{
			this.SetLocation(this.mergeElem, 0, 5);
			this.Center(this.mergeElem);
		}
		this.width += 3;
		this.Show();
		if (!creating && this.editor)
			this.editor.Resize();
	}

	ASPROT.FinishDesigner = function (ok)
	{
		if (ok)
			this.fmObj.LinkMatches();
	}

	if (typeof (fvmCtl) != 'undefined')
	{
		fvmCtl.fvm.AddPlugin(flow.logic.ActionEditor, 'design', 'ActionEditor');
	}
	else
		alert('Action Editor Plugin Loaded but no Macro Control object to bind to...');
} ());
