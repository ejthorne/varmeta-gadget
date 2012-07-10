// Module Pattern for best performance and non-global vars
/// <reference path="../SCMacros.js" />
/// <reference path="../DynWin.js" />
/// <reference path="../ScreenInfo.js" />
/// <reference path="../MacDesign.js" />
/// <reference path="../FlowEdit.js" />
/// <reference path="../MacrosMgr.htm" />
/// <reference path="../DragMgr.js" />
/// <reference path="../Plugin.js" />
(function ()
{
	//-------------------------TemplateEditor Class -----------------------------
	// TemplateEditor inherits from DynWin
	flow.macs.TemplateEditor = function (owner, htDoc, parent, title, templateText)
	{
		flow.macs.DynWin.call(this, htDoc, parent);
		this.init('tempEdit', title, true, 1200);
		this.owner = owner;
		this.templateText = templateText;
		this.title = title;
		this.fields = [];
	}
	flow.macs.TemplateEditor.prototype = new flow.macs.DynWin();
	var TEPROT = flow.macs.TemplateEditor.prototype; //convenience
	TEPROT.constructor = flow.macs.TemplateEditor;

	TEPROT.Display = function (onClose)
	{
		var me = this, t;
		this.onClose = onClose;
		this.titleElem = this.NewDiv('title', 'title', this.elem, this.title);
		this.NewDesignerForm(this.elem, '45em');
		t = '<textarea id="txtTemplate" rows="15" cols="60" style="overflow:auto">' + this.templateText + '</textarea>';
		this.textElem = this.NewDiv("divTemplate", "userInput", this.designerForm, t, '42em');
		this.actionsElem = this.NewDiv('actions', 'actions', this.designerForm);
		this.verBtn = this.NewButton('verBtn', 'Verify Merge Fields', this.actionsElem);
		this.verBtn.onclick = function ()
		{
			var text = me.getById('txtTemplate').value,
				fields = me.owner.owner.ParseTemplate(text),
				t, i, indent = '';
			if (fields == null)
				alert('Error Verifying the active Template Text...');
			else
			{
				t = 'The Template contains ' + fields.length + ' Field Tokens:\n\n';
				for (i = 0; i < fields.length; i++)
				{
					if (fields[i].type == 'SectionStart')
					{
						t += 'SectionStart: ' + fields[i].name +'\n';
						indent += '  ';
					}
					else if (fields[i].type == 'SectionEnd')
					{
						t += 'SectionEnd:   ' + fields[i].name +'\n';
						indent = indent.substr(0, indent.length - 2);
					}
					else
						t += indent + fields[i].name + '\n';
				}
				alert(t);
			}

		};
		this.okBtn = this.NewButton('okBtn', 'OK', this.actionsElem);
		this.okBtn.onclick = function ()
		{
			me.templateText = me.getById('txtTemplate').value;
			me.BtnAction('ok')
		};
		this.cancelBtn = this.NewButton('canBtn', 'Cancel', this.actionsElem);
		this.cancelBtn.onclick = function () { me.BtnAction('cancel') };
		this.Resize();
	}

	TEPROT.Resize = function ()
	{
		this.height = this.width = 0;
		this.SetLocation(this.titleElem, 0, 5);
		this.SetLocation(this.designerForm, 0, 0);
		this.SetLocation(this.textElem, 5, 5);
		this.SetLocation(this.actionsElem, 0, 5);
		this.width += 3;
		this.Center(this.titleElem);
		this.Center(this.textElem);
		this.Center(this.actionsElem);
		this.Show(this.onClose);
	}


} ());

