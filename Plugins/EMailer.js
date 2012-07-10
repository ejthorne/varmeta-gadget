// Module Pattern for best performance and non-global vars
/// <reference path="../SCMacros.js" />
/// <reference path="../DynWin.js" />
/// <reference path="../ScreenInfo.js" />
/// <reference path="../MacDesign.js" />
/// <reference path="../FlowEdit.js" />
/// <reference path="../MacrosMgr.htm" />
/// <reference path="../Plugin.js" />
/// <reference path="Mustache.js" />
(function ()
{
	//------------------- Client-side Email Sender --------------------
	flow.macs.EMailer = function (runtime)
	{
		flow.macs.Plugin.call(this, runtime, 'eMailer',
								'Client EMail Sender', false, true);
		this.serverFolder = 'EMailer';
		this.docFields = [];
	}
	// EMailer inherits from Plugin
	flow.macs.EMailer.prototype = new flow.macs.Plugin();
	var EMPROT = flow.macs.EMailer.prototype; // convenience
	EMPROT.constructor = flow.macs.EMailer;

	EMPROT.GetIcon = function (extIsTarget)
	{
		return "webMail";
	}

	// Override Plugin.InitDesigner to spec our own
	EMPROT.InitDesigner = function (htDoc, parent, instanceId, design, extIsTarget)
	{
		if (!this.designer ||
			 (this.designer.extIsTarget != extIsTarget) ||
			 (this.designer.instanceId != instanceId))
			this.designer = new flow.macs.EMailDesigner(this, htDoc, parent, instanceId, design);
		return this.designer;
	}

	EMPROT.SendEMail = function (parms, varsMeta, subjectText, subjectIsTemplate, extPropName)
	{
		var emailText,
	 		 view = this.BuildTemplateView(parms, varsMeta, (extPropName) ? extPropName : 'ext$EMWrt');
		emailText = this.MergeTemplate(view);

		if (!parms.Mailto && parms.mailto)
			parms.Mailto = parms.mailto;
		if (!parms.Mailto)
			parms.Mailto = prompt("Please enter the target EMail address--the Macro is missing the mailto or Mailto variable definition...", "");
		if (!subjectText)
			subjectText = 'No Subject...';
		else if (subjectIsTemplate)
			subjectText = this.MergeTemplate(view, subjectText);
		this.SetMacIFrameLoc('mailto:' + parms.Mailto
			+ '?subject=' + encodeURIComponent(subjectText)
			+ '&body=' + encodeURIComponent(emailText));
	}

	//-------------------------EMailDesigner Class -----------------------------
	flow.macs.EMailDesigner = function (owner, htDoc, parent, instanceId, design)
	{
		flow.macs.PluginDesigner.call(this, owner, htDoc, parent, instanceId, design, true, 'Macro');
		this.init('em_driver', "EMail Client Send Options", false, 600);
		this.serverFolder = 'EMailer';
		this.docPathName = 'EMTemplate';
		this.extPropName = 'ext$EMWrt';
		this.LocalInit();
	}

	// EMailDesigner inherits from PluginDesigner (a DynWin child)
	flow.macs.EMailDesigner.prototype = new flow.macs.PluginDesigner();
	var EDPROT = flow.macs.EMailDesigner.prototype; // convenience
	EDPROT.constructor = flow.macs.EMailDesigner;
	EDPROT.LocalInit = function ()
	{
		this.docLabel = 'EMail Text Template';
	}

	EDPROT.GenCode = function (phase)
	{
		var lines = new Array();
		switch (phase)
		{
			case 'Init':
				if (this.data.activeFileType == 'Macro')
					lines.push(this.FormatJSStringVar('macro.' + this.GetUniqueVarName('EMTemplate'), this.data.templateText));
				lines.push(this.FormatJSStringVar('macro.' + this.GetUniqueVarName('EMSubject'), this.data.subjectText));
				lines.push('macro.' + this.GetUniqueVarName('EMSubjIsTemplate') + '=' + ((this.data.subjectIsTemplate) ? 'true;' : 'false;'));
				return { "lines": lines };
			case 'PreExec':
				if (this.data.activeFileType != 'Macro')
				{
					lines.push('var wait;');
					lines.push('if (this.last' + this.GetDocPathName() + ' &&');
					lines.push('    (this.last' + this.GetDocPathName() + ' == this.vars.' + this.GetDocPathName() + '))');
					lines.push('  wait=false; // don\'t need to load...');
					lines.push('else');
					lines.push('{');
					lines.push('  this.last' + this.GetDocPathName() + ' = this.vars.' + this.GetDocPathName() + ';');
					lines.push('  wait = macro.plugins.eMailer.LoadTemplate(this.vars.' + this.GetDocPathName() + ');');
					lines.push('}');
					return { "lines": lines, "waitExp": "wait" };
				}
				return null;
			case 'Exec':
				if (this.data.activeFileType == 'Macro')
				{
					lines.push('macro.runtime.templateText = macro.' + this.GetUniqueVarName('EMTemplate') + ';');
					lines.push('macro.plugins.eMailer.LoadTemplate();');
				}
				lines.push('macro.plugins.eMailer.SendEMail(this.vars, this.varsMeta,\n\tmacro.' + this.GetUniqueVarName('EMSubject') + ', macro.' + this.GetUniqueVarName('EMSubjIsTemplate') + ', "' + this.GetExtPropName() + '");');
				return { "lines": lines };
		}
		return null;
	}

	EDPROT.GetMatchExtDefs = function ()
	{
		var names = [], i, field, name, sectionObj = null, pushTo = names;
		names.push({ 'name': 'mailto', 'nameType': 'Email Addr', 'ext$Props': { 'name': 'mailto', 'target': 'address'} });
		this.AnalyzeSubject();
		for (i = 0; i < this.data.subjectTokens.length; i++)
		{
			field = this.data.subjectTokens[i];
			if (field.type == 'name')
			{
				name = flow.macs.trim(field.name);
				names.push({ 'name': name, 'nameType': 'Subject', 'ext$Props': { 'name': name, 'target': 'subject'} });
			}
		}
		for (i = 0; i < this.data.docFields.length; i++)
		{
			field = this.data.docFields[i];
			if (field.type != 'name')
			{
				if (field.type == 'SectionStart')
				{
					name = flow.macs.trim(field.name);
					sectionObj = { 'name': name, 'nameType': 'Section', 'children': [], 'ext$Props': { 'name': name, 'target': 'body', 'hasChildren': true} };
					names.push(sectionObj);
					pushTo = sectionObj.children;
				}
				else if (field.type == 'SectionEnd')
				{
					sectionObj = null;
					pushTo = names;
				}
				continue;
			}
			name = flow.macs.trim(field.name);
			if (flow.macs.indexOf(pushTo, name) == -1)
			{
				pushTo.push({ 'name': name, 'nameType': 'Token', 'ext$Props': { 'name': name, 'target': 'body'} });
			}
		}
		return names;
	}

	EDPROT.Display = function (editor)
	{
		var me = this, t,
		   subjSetting = (this.data.subjectText) ? ' value="' + this.data.subjectText + '"' : '';
		this.editor = editor;
		var activeDoc = (this.data.activeDoc) ? this.data.activeDoc : "none...";
		this.NewDesignerForm(this.elem);
		t = '<label style="width:8em;">Email Subject:</label><br />';
		t += '<input type="text" name="emSubj" id="emSubj" size="70"' + subjSetting + ' />';
		t += '<br /><span id="emSubjInfo" class="small" style="margin:2px">Use one or more {{FieldName}} tokens in Subject to enable Runtime content merging...</span>';
		this.subjElem = this.NewDiv('actions', 'userInput', this.designerForm, t, '40em');
		this.fileElem = this.NewFilePrompt(this.designerForm, activeDoc, "40em", this.data.activeFileType, true);
		this.CheckForMerging();
		this.Resize(true);
		return this.elem;
	}

	EDPROT.Resize = function (creating)
	{
		this.height = this.width = 0;
		this.SetLocation(this.designerForm, 0, 0);
		this.SetLocation(this.subjElem, 5, 5);
		this.SetLocation(this.fileElem, 5, 5);
		if (this.mergeElem)
			this.SetLocation(this.mergeElem, 0, 5);
		this.width += 3;
		this.Show();
		if (!creating && this.editor)
			this.editor.Resize();
	}

	EDPROT.FinishDesigner = function (ok)
	{
		if (ok)
		{
			if (!this.data.IsMatched ||
					(this.data.matchDoc != this.data.activeDoc))
			{
				alert('You need to match the fields for the most recently selected EMail template file...');
				return;
			}
			this.AnalyzeSubject();
			this.data.promptForDoc = ((this.data.activeFileType != 'Macro') && this.FilePromptIsChecked())
			if (this.fmObj)
				this.fmObj.LinkMatches();
			this.BtnAction('ok');
		}
	}

	EDPROT.AnalyzeSubject = function ()
	{
		var subjElem = this.getById('emSubj');
		if (subjElem)
			this.data.subjectText = this.getById('emSubj').value;
		this.data.subjectTokens = this.owner.ParseTemplate(this.data.subjectText);
		this.data.subjectIsTemplate = (this.data.subjectTokens.length > 0);
	}

	EDPROT.CheckDoc = function (callBack)
	{
		var ok = true,
			me = this,
			doc;
		if ((this.data.activeFileType != 'Macro') &&
			 (this.data.activeDoc == null))
		{
			alert('You need to select an EMail Template and then use the Field Name Match action before clicking OK...');
			ok = false;
		}

		if (ok)
		{
			try
			{
				if (this.data.activeFileType != 'Macro')
				{
					this.owner.LoadTemplate(this.data.activeDoc, function (templateText, fields)
					{
						if (!templateText)
						{
							alert('You file currently selected is not a valid EMail Template, which contains merge Field definitions...');
							ok = false;
						}
						else
						{
							me.data.docFieldCount = fields.length;
							me.data.docFields = fields;
							me.data.validatedDoc = me.data.activeDoc;
						}
						if (callBack)
							callBack(ok);
					});
				}
				else
				{
					this.data.docFields = this.owner.ParseTemplate(this.data.templateText);
					this.data.docFieldCount = this.data.docFields.length;
					if (callBack)
						callBack(ok);
				}
			}
			catch (e)
			{
				alert('Exception opening selected file "' + me.data.activeDoc + '": ' + e.message);
				ok = false;
			}
		}
		return false;
	}

	if (fvmCtl)
		fvmCtl.fvm.AddPlugin(flow.macs.EMailer);
	else
		alert('Plugin Loaded but no Macro Control object to bind to...');
} ());
