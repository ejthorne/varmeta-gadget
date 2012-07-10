// Module Pattern for best performance and non-global vars
/// <reference path="../SCMacros.js" />
/// <reference path="../DynWin.js" />
/// <reference path="../ScreenInfo.js" />
/// <reference path="../MacDesign.js" />
/// <reference path="../FlowEdit.js" />
/// <reference path="../MacrosMgr.htm" />
/// <reference path="../Plugin.js" />
(function ()
{
	//------------------- Office File Opener -------------------------
	flow.macs.DocMerger = function (runtime)
	{
		flow.macs.Plugin.call(this, runtime, 'docMerge',
								'Microsoft Word Merge Document / Template', false, true);
		this.serverFolder = 'DocMerger';
	}
	// DocMerger inherits from Plugin
	flow.macs.DocMerger.prototype = new flow.macs.Plugin();
	var DMPROT = flow.macs.DocMerger.prototype; // convenience
	DMPROT.constructor = flow.macs.DocMerger;

	// Override Plugin.InitDesigner to spec our own					 
	DMPROT.InitDesigner = function (htDoc, parent, instanceId, design, extIsTarget)
	{
		if (!this.designer ||
			 (this.designer.extIsTarget != extIsTarget) ||
			 (this.designer.instanceId != instanceId))
			this.designer = new flow.macs.DocMDesigner(this, htDoc, parent, instanceId, design);
		return this.designer;
	}

	DMPROT.GetIcon = function (extIsTarget)
	{
		return "docWrite";
	}


	// Open a Word Document with ActiveX
	DMPROT.OpenWordDoc = function (docPath, visibility)
	{
		var docFixedPath = flow.macs.GetFileRef(docPath);
		try
		{
			this.oDoc = new ActiveXObject("Word.Application"); // creates the word object
			if (visibility)
				this.oDoc.Visible = visibility;
			this.oDoc.Documents.Open(docFixedPath); // specify path to document
			this.docPath = docPath;
			return this.oDoc.ActiveDocument;
		}
		catch (e)
		{
			alert('OpenWordDoc failed for "' + docFixedPath + '": ' + e.message);
		}
		return null;
	}

	DMPROT.MergeToDocFields = function (parms, varsMeta, extPropName)
	{
		var varName, i, field, name,
			 extFields = {}, extProp;
		if (!extPropName)
			extPropName = 'ext$DocWrt';
		for (varName in varsMeta)
		{
			extProp = varsMeta[varName][extPropName];
			if (extProp)
				extFields[extProp.name] = parms[varName];
		}
		for (i = this.oDoc.ActiveDocument.Fields.Count; i > 0; i--)
		{
			field = this.oDoc.ActiveDocument.Fields(i);
			name = flow.macs.trim(field.Code.Words(3).Text);
			if (extFields[name])
			{
				field.Select();
				this.oDoc.Selection.Cut();
				this.oDoc.Selection.InsertAfter(extFields[name]);
			}
		}
	}

	DMPROT.GetDocContents = function (docPath, visibility)
	{
		try
		{
			if (this.oDoc)
				return this.oDoc.Documents(this.docPath).Content;
			return '';
		}
		catch (e)
		{
			alert('GetDocContents failed for "' + docPath + '": ' + e.message);
		}
		return null;
	}

	// Define this when after a field match, the doc should be closed
	DMPROT.CloseMatchDoc = function ()
	{
		this.CloseDoc();
	}

	DMPROT.CloseDoc = function ()
	{
		if (this.oDoc)
		{
			this.oDoc.quit(0);
			this.oDoc = null;
		}
	}

	//-------------------------DocMDesigner Class -----------------------------
	flow.macs.DocMDesigner = function (owner, htDoc, parent, instanceId, design)
	{
		flow.macs.PluginDesigner.call(this, owner, htDoc, parent, instanceId, design, true, 'PC');
		this.init('dm_driver', "Microsoft Office Word Document Merge Options", false, 600);
		this.serverFolder = 'DocMerger';
		this.extPropName = 'ext$DocWrt';
		this.docPathName = 'WordDoc';
		this.LocalInit();
	}

	// DocMerger inherits from PluginDesigner (a DynWin child)
	flow.macs.DocMDesigner.prototype = new flow.macs.PluginDesigner();
	var DDPROT = flow.macs.DocMDesigner.prototype; // convenience
	DDPROT.constructor = flow.macs.DocMDesigner;
	DDPROT.LocalInit = function ()
	{
		this.docLabel = 'Word Document Template';
		this.matchTargTitle = 'Word Fields';
	}

	DDPROT.GenCode = function (phase)
	{
		if (phase == 'Exec')
		{
			var lines = new Array();
			lines.push('macro.plugins.docMerge.OpenWordDoc(this.vars.' + this.GetDocPathName() + ',true);');
			lines.push('macro.plugins.docMerge.MergeToDocFields(this.vars, this.varsMeta, "' + this.GetExtPropName() + '");');
			return { "lines": lines };
		}
		return null;
	}

	DDPROT.GetMatchExtDefs = function ()
	{
		var doc = this.owner.OpenWordDoc(this.data.activeDoc, true),
			 names = [], i, field, name;
		for (i = 1; i <= doc.Fields.Count; i++)
		{
			field = doc.Fields(i);
			name = flow.macs.trim(field.Code.Words(3).Text);
			names.push({ 'name': name, 'ext$Props': { 'name': name} });
		}
		return names;
	}

	DDPROT.Display = function (editor)
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

	DDPROT.Resize = function (creating)
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

	DDPROT.FinishDesigner = function (ok)
	{
		if (ok)
		{
			if (!this.data.IsMatched ||
					(this.data.matchDoc != this.data.activeDoc))
			{
				alert('You need to match the fields for the most recently selected Document template file...');
				return;
			}
			this.data.promptForDoc = this.FilePromptIsChecked();
			this.fmObj.LinkMatches();
			this.BtnAction('ok');
		}
	}

	DDPROT.CheckDoc = function (callBack)
	{
		var ok = true;
		if (this.data.activeDoc == null)
		{
			alert('You need to select a merge Document (usually a .dot file) and then use the Field Name Match action before clicking OK...');
			ok = false;
		}

		if (ok &&
			 (this.data.validatedDoc != this.data.activeDoc))
		{
			var doc = null;
			try
			{
				doc = this.owner.OpenWordDoc(this.data.activeDoc, false);
				if (!doc || !doc.Fields || (doc.Fields.Count == 0))
				{
					alert('You file currently selected is not a valid Word merge document, which contains merge Field definitions...');
					ok = false;
				}
				else
					this.data.docFieldCount = doc.Fields.Count;
			}
			catch (e)
			{
				alert('Exception opening selected file "' + this.data.activeDoc + '": ' + e.message);
				ok = false;
			}
			finally
			{
				if (doc)
					this.owner.CloseDoc();
			}
			this.data.validatedDoc = this.data.activeDoc;
		}
		if (callBack)
			callBack(ok);
		return ok;
	}
	if (fvmCtl)
		fvmCtl.fvm.AddPlugin(flow.macs.DocMerger);
	else
		alert('Plugin Loaded but no Macro Control object to bind to...');
} ());
