// Module Pattern for best performance and non-global vars
/// <reference path="SCMacros.js" />
/// <reference path="ScreenInfo.js" />
/// <reference path="MacDesign.js" />
/// <reference path="FlowEdit.js" />
/// <reference path="MacrosMgr.htm" />
/// <reference path="plugins/Mustache.js" />
(function ()
{
	var _indexOf = Array.prototype.indexOf;
	if (_indexOf)
	{
		flow.macs.indexOf = function (arr, obj, from)
		{
			return _indexOf.call(arr, obj, from);
		};
	}
	else
	{
		flow.macs.indexOf = function (arr, obj, from)
		{
			var l = arr.length,
			i = from ? parseInt((1 * from) + (from < 0 ? l : 0), 10) : 0;
			i = i < 0 ? 0 : i;
			for (; i < l; i++)
			{
				if (arr[i] === obj) { return i; }
			}
			return -1;
		};
	}

	flow.macs.MatchVars = function (varRefs, saveArray, extIsTarget, extPropName)
	{
		var v, varRef, newVar, extProp;
		for (v = 0; v < varRefs.length; v++)
		{
			varRef = varRefs[v];
			if (varRef.linkedTo)
			{
				newVar = varRef.bindObj;
				if (!newVar)
				{
					newVar = varRef.bindObj = { 'name': varRef.name, 'val': varRef.val, 'type': varRef.type };
					if (extIsTarget)
						newVar.source = varRef.source;
					saveArray.push(newVar);
				}
				else
				{
					// In case of an update...
					newVar.name = varRef.name;
					newVar.type = varRef.type;
					newVar.val = varRef.val;
					if (extIsTarget)
						newVar.source = varRef.source;
				}
				extProp = varRef.linkedTo.ext$Props;
				if (!extProp)
					extProp = varRef.linkedTo.name;
				newVar[extPropName] = extProp;
				if (extIsTarget &&
					 (varRef.source == 'user'))
				{
					newVar.label = varRef.label;
					newVar.title = varRef.title;
				}
				if (varRef.hasChildren)
				{
					newVar.hasChildren = true;
					if (!newVar.children)
						newVar.children = [];
					if (varRef.newChildren)
					{
						flow.macs.SaveNewMacVars(varRef.newChildren, newVar.children, extIsTarget, extPropName);
						varRef.newChildren = [];
					}
				}
			}
			else
				flow.macs.ClearExProps(varRef, extPropName);
		}
	}

	flow.macs.PairOnExtNames = function (fromArr, toArr, extPropName, onMissingMatch)
	{
		var f, t, from, to, extPropObj, extPropObj2;
		for (f = 0; f < fromArr.length; f++)
		{
			from = fromArr[f];
			extPropObj = (from.bindObj) ? from.bindObj[extPropName] : from[extPropName];
			if (!extPropObj)
				continue;
			for (t = 0; t < toArr.length; t++)
			{
				to = toArr[t];
				extPropObj2 = to.ext$Props;
				if (!extPropObj2)
					extPropObj2 = to.name;
				if (flow.macs.ExtPropsEqual(extPropObj, extPropObj2))
				{
					from.linkedTo = to;
					to.linkedTo = from;
					break;
				}
			}
			if (!from.linkedTo && onMissingMatch)
			{
				to = onMissingMatch(extPropObj);
				from.linkedTo = to;
				to.linkedTo = from;
				toArr.push(to);
				if (to.hasChildren)
				{
					flow.macs.PairOnExtNames(from.children, to.children, extPropName, onMissingMatch);
				}
				if (extPropObj.newChildrenFunc)
					extPropObj.newChildrenFunc(extPropObj, to.children);
			}
		}
	}

	flow.macs.ExtPropsEqual = function (ext1, ext2)
	{
		var t1 = typeof (ext1), t2 = typeof (ext2),
			 prop;
		if (t1 != t2)
			return false;
		if ((t1 == 'string') && (t2 == 'string'))
			return (ext1 == ext2);
		// must be objects
		if (ext1.type != ext2.type)
			return false;
		for (prop in ext1)
		{
			if (ext1[prop] != ext2[prop])
				return false;
		}
		return true;
	}

	flow.macs.ClearExProps = function (macVar, extPropName)
	{
		var i, children;
		if (macVar.bindObj && macVar.bindObj[extPropName])
		{
			delete macVar.bindObj[extPropName];
			if (macVar.hasChildren)
			{
				children = macVar.children
				for (i = 0; i < children.length; i++)
				{
					flow.macs.ClearExProps(children[i]);
				}
			}
		}
	}

	flow.macs.SaveNewMacVars = function (vars, saveToArray, extIsTarget, extPropName)
	{
		var i, macVar, newVar;
		for (i = 0; i < vars.length; i++)
		{
			macVar = vars[i];
			newVar = { 'name': macVar.name, 'val': macVar.val, 'type': macVar.type };
			if (extIsTarget)
				newVar.source = macVar.source;
			if (macVar[extPropName])
				newVar[extPropName] = macVar[extPropName];
			if (extIsTarget &&
				 (macVar.source == 'user'))
			{
				newVar.label = macVar.label;
				newVar.title = macVar.title;
			}
			saveToArray.push(newVar);
			if (macVar.hasChildren)
			{
				newVar.children = [];
				newVar.hasChildren = true;
				flow.macs.SaveNewMacVars(macVar.children, newVar.children, extIsTarget, extPropName);
				if (macVar.newChildren)
					flow.macs.SaveNewMacVars(macVar.newChildren, newVar.children, extIsTarget, extPropName);
				macVar.children = [];
				macVar.newChildren = [];
			}
		}
	}

	//--------------------  Plugin Class ----------------------------
	flow.macs.Plugin = function (runtime, id, title, isSource, isTarget)
	{
		// check for empty (default) constructor)
		if (runtime)
		{
			this.runtime = runtime;
			this.id = id;
			this.IsTarget = isTarget;
			this.IsSource = isSource;
			this.title = title;
		}
	}
	var FPPROT = flow.macs.Plugin.prototype; //convenience

	FPPROT.GetTitle = function (extIsTarget)
	{
		return this.title;
	}

	FPPROT.InitDesigner = function (htDoc, parent, instanceId, design, extIsTarget)
	{
		if (!this.designer ||
			 (this.designer.extIsTarget != extIsTarget) ||
			 (this.designer.instanceId != instanceId))
			this.designer = new flow.macs.PluginDesigner(this, htDoc, parent, instanceId, design, extIsTarget, true, 'PC');
		return this.designer;
	}

	// Open a Template
	FPPROT.GetTemplate = function (docPath, callBack)
	{
		var docFixedPath = flow.macs.GetFileRef(docPath),
			 text = null, delayed = false;
		try
		{
			if (docPath.toLowerCase().substr(0, 5) == 'http:')
			{
				delayed = true; // template not immediately available
				this.runtime.AxCall('*' + 'http://' + encodeURI(docPath.substr(7)),
					function (oxh)
					{
						if (oxh.status == 404)
						{
							alert('No Template found at "' + docPath + '"!');
							callBack(null);
						}
						else
							callBack(oxh.responseText);
					});
			}
			else
			{
				text = this.OpenPCFile(docPath);
			}
		}
		catch (e)
		{
			alert('OpenTemplate failed for "' + docFixedPath + '": ' + e.message);
		}
		if (!delayed)
			callBack(text);
		return delayed;
	}

	// Load the template
	FPPROT.LoadTemplate = function (docPath, designerCallBack)
	{
		var me = this, delayed = false;
		if (docPath &&
			 ((this.runtime.templateText == null) ||
		     !this.runtime.templatePath ||
			  (this.runtime.templatePath != docPath)))
		{
			delayed = this.GetTemplate(docPath, function (text)
			{
				me.runtime.templatePath = docPath;
				me.runtime.templateText = me.templateText = text;
				if (designerCallBack)
					designerCallBack(me.runtime.templateText, me.ParseTemplate(me.runtime.templateText));
				else
				{
					if (delayed)
						me.runtime.ActiveMacroRun(); // continue the macro...
				}
			});
		}
		else if (designerCallBack)
			designerCallBack(me.runtime.templateText, me.ParseTemplate(me.runtime.templateText));
		return delayed;
	}

	FPPROT.SetMacIFrameLoc = function (url)
	{
		var mfElem, emDoc;

		mfElem = document.getElementById('macIfrm');
		if (!mfElem)
		{
			mfElem = document.createElement('iframe');
			mfElem.id = 'macIfrm';
			mfElem.style.visibility = 'hidden';
			mfElem.style.width = mfElem.style.height = 0;
			document.body.appendChild(mfElem);
		}
		emDoc = (mfElem.document) ? mfElem.document : mfElem.contentDocument;
		if (emDoc.location != url)
		{
			emDoc.location = url;
		}
		else
		{
			var winwin = window.frames["macIfrm"];
			if (winwin && winwin.Reload)
				winwin.Reload();
		}
	}

	FPPROT.BuildTemplateView = function (parms, varsMeta, extPropName)
	{
		var view = {}, extDef, varMeta, varName, i, children, parmsArr;
		for (varName in varsMeta)
		{
			varMeta = varsMeta[varName];
			if (varMeta[extPropName])
			{
				extDef = varMeta[extPropName];
				if (varMeta.varsMeta)
				{
					view[extDef.name] = children = [];
					parmsArr = parms[varName];
					for (i = 0; i < parmsArr.length; i++)
					{
						children[i] = this.BuildTemplateView(parmsArr[i], varMeta.varsMeta, extPropName);
					}
				}
				else
					view[extDef.name] = parms[varName];
			}
		}
		return view;
	}

	FPPROT.MergeTemplate = function (view, text)
	{
		if (!text)
			text = this.runtime.templateText;
		return Mustache.render(text, view);
	}

	// Open a local file using ActiveX
	FPPROT.OpenPCFile = function (name)
	{
		if (!window.ActiveXObject)
		{
			alert("Sorry, you are trying to use an ActiveX object in a browser or platform that does not support ActiveX...");
			return null;
		}
		var fso,
			forReading = 1,
			f, txt = null, stream, charSet, chr1, chr2, chr3;
		try
		{
			fso = new ActiveXObject('Scripting.FileSystemObject');
			if (fso.FileExists(name))
			{
				f = fso.GetFile(name);
				if (f.size)
				{
					//Detect Unicode Files
					stream = fso.OpenTextFile(name, 1, false);
					txt = stream.read(3);
					chr1 = txt.charCodeAt(0);
					chr2 = txt.charCodeAt(1);
					chr3 = txt.charCodeAt(2);
					stream.Close();
					charSet = 'ascii';
					if ((chr1 == 239) && (chr2 == 187) && (chr3 == 191))
						charSet = 'utf-8';
					else if ((chr1 == 255) && (chr2 == 254))
						charSet = 'unicode';
					//Get script content
					stream = fso.OpenTextFile(name, 1, 0, (charSet == 'unicode'));
					txt = stream.ReadAll();
					stream.Close();
				}
			}
			else
			{
				return null;
			}
		}
		catch (e)
		{
			alert('Exception opening file "' + name + '": ' + e.message);
		}
		if (charSet == 'utf-8')
			return txt.substr(3);
		else
			return txt;
	}

	//Parse a Mustache template...
	FPPROT.ParseTemplate = function (template)
	{
		var findStaches = /(\{\{[>#^\/{&\w]{1,25}?\}\})/g; ;
		var parsed = template.match(findStaches);
		var tokens = [];
		if (!parsed)
			return tokens;
		for (var i = 0; i < parsed.length; i++)
		{
			var token = parsed[i].substr(2, parsed[i].length - 4),
				 type = "name", name = null;
			switch (token.charAt(0))
			{
				case '{': // escape
				case '&': // another escape, still simple name
					break;
				case '#': // start section
					type = 'SectionStart';
					break;
				case '/':
					type = 'SectionEnd';
					break;
				case '^':
					type = 'InvertedSectionStart'; // not supported
					break;
				case '>':
					type = 'Partial'; // not supported...
					break;
				default:
					name = token;
					break;
			}
			if (name == null) // was special character start
				name = flow.macs.trim(token.substring(1));
			tokens.push({ 'name': name, 'type': type });
		}
		return tokens;
	}


	//--------------------  PluginDesigner Class ----------------------------
	flow.macs.PluginDesigner = function (owner, htDoc, parent, instanceId, design, extIsTarget, defaultFileType)
	{
		var pluginKey;
		if (!owner)
			return; //null constructor
		flow.macs.DynWin.call(this, htDoc, parent, true);
		this.serverFolder = 'default';
		this.docLabel = "Template File";
		this.matchPoolTitle = 'Parameters';
		this.matchTargTitle = 'Template Fields';
		this.docPathName = 'DocPath';
		this.extPropName = 'ext$Props';
		this.owner = owner;
		this.extIsTarget = extIsTarget;
		this.design = design;
		this.screens = design.screens;
		pluginKey = this.GetKey(instanceId);
		this.data = design.RegisterPluginDesigner(pluginKey, instanceId, extIsTarget, defaultFileType);
	}
	flow.macs.PluginDesigner.prototype = new flow.macs.DynWin();
	var PDPROT = flow.macs.PluginDesigner.prototype; //convenience
	PDPROT.constructor = flow.macs.PluginDesigner;

	PDPROT.SetAction = function (action)
	{
		this.action = action;
	}

	PDPROT.GenCode = function (phase)
	{
		if (phase == "Exec")
		{
			return ['//!!!!! Plugin "' + this.title + '" has no GenCode function defined--cannot generate Macro from it...'];
		}
		else
			return null;
	}

	PDPROT.GetKey = function (instanceId)
	{
		return new String(this.owner.id + this.GetInstanceKey(instanceId) + ((this.extIsTarget) ? '_Targ' : '_Src'));
	}

	PDPROT.GetInstanceKey = function (instanceId)
	{
		if (typeof (instanceId) != 'undefined')
			return ((instanceId > 0) ? '_' + instanceId : '');
		return ((this.data && (this.data.instanceId > 0)) ? '_' + this.data.instanceId : '');
	}

	PDPROT.GetExtPropName = function ()
	{
		return this.extPropName + this.GetInstanceKey();
	}

	PDPROT.GetDocPathName = function ()
	{
		return this.docPathName + this.GetInstanceKey();
	}

	PDPROT.GetUniqueVarName = function (name)
	{
		return name + this.GetInstanceKey();
	}

	PDPROT.ShowMergeOnly = function (onClose)
	{
		this.onMatchClose = onClose;
		this.OpenMatch();
	}

	PDPROT.Display = function (onClose)
	{
		this.Show(onClose);
	}

	// format a text as multi-line JS to retain look and feel of original
	PDPROT.FormatJSStringVar = function (toName, text, indent)
	{
		if (!indent)
			indent = '';
		var t = indent + toName + " = '",
			 c, ch, lastCh = ' ';
		indent += '  ';
		for (c = 0; c < text.length; c++)
		{
			ch = text.charAt(c);
			switch (ch)
			{
				case '\n':
					if (lastCh == '\r')
						break; //ignore
					//otherwise drop-through
				case '\r':
					t += "\\r\\n'\r\n" + indent + "+ '";
					break;
				case '\t':
					t += '\t';
					break;
				default:
					t += ch;
			}
			lastCh = ch;
		}
		t += "';";
		return t;
	}

	PDPROT.CheckForMerging = function ()
	{
		if (this.data.IsMatched &&
			 (this.data.activeDoc == this.data.matchDoc))
			this.ShowMerge(true);
	}

	PDPROT.GetVarRefs = function ()
	{
		return this.action.container.GetVarRefs('match');
	}

	PDPROT.OpenMatch = function ()
	{
		var me = this, fmObj, fmId = 'mf' + this.GetKey() + 'id',
			 extDef, extDefs, macVar, i, varRefs;
		this.data.matchDoc = this.data.activeDoc;
		fmObj = this.fmObj = new flow.macs.FieldMatcher(this.htDoc, this.elem, fmId, this.extIsTarget, this.GetExtPropName(),
					this.title + ' Variable Matching', function (obj, status) { me.MatchAction(obj, status) });
		fmObj.poolTitle = this.matchPoolTitle;
		fmObj.targTitle = this.matchTargTitle;
		fmObj.topOffset = -80;
		if (this.matchSetVarStyle)
			fmObj.SetVarStyle = this.matchSetVarStyle;
		if (this.matchSetExtStyle)
			fmObj.SetExtStyle = this.matchSetExtStyle;
		this.SetMatchingEvents(this.fmObj);
		extDefs = this.GetMatchExtDefs();
		fmObj.AddExtRefs(extDefs);
		varRefs = this.GetVarRefs();
		for (i = 0; i < varRefs.length; i++)
		{
			macVar = varRefs[i];
			fmObj.AddVarRef(macVar.name, macVar, macVar.type, macVar.label, macVar.source, macVar.val);
		}

		if (this.data.newVars)
		{
			for (i = 0; i < this.data.newVars.length; i++)
			{
				macVar = this.data.newVars[i];
				fmObj.AddVarRef(macVar.name, macVar, macVar.type, macVar.label, macVar.source, macVar.val);
			}
		}
		this.fmObj.Draw();
	}

	PDPROT.SetNewVarRef = function (fmObj)
	{
		var me = this, NPWindow;
		fmObj.onNewVarRef = function (varRef, extDef, onClose, existingVar, varSourceList, defaultSource)
		{
			if (extDef.hasChildren)
				NPWindow = new flow.macs.PluginNewVarGrp(me.htDoc, me.owner.runtime, me.fmObj.elem, varRef, extDef, existingVar, this.extIsTarget);
			else
			{
				NPWindow = new flow.macs.PluginNewVar(me.htDoc, me.owner.runtime, me.fmObj.elem, varRef, extDef, existingVar, this.extIsTarget);
				NPWindow.defaultSource = defaultSource;
			}
			NPWindow.varSourceList = varSourceList;
			NPWindow.Display(onClose);
		};

	}

	PDPROT.SetMissingMatch = function (fmObj, extTypeList)
	{
		var me = this;
		if (extTypeList)
			this.matchTypeList = extTypeList;
		else
			this.matchTypeList = null;
		fmObj.onMissingMatch = function (extName)
		{
			if (typeof (extName) == 'object')
			{
				var ref = { "name": extName.name, "type": extName.type, "dynamicDef": true,
					"ext$Props": extName
				};
				if (extName.hasChildren)
				{
					if (me.matchTypeList)
					{
						if (me.matchTypeList[extName.type] &&
							 me.matchTypeList[extName.type].newChildrenFunc)
							extName.newChildrenFunc = me.matchTypeList[extName.type].newChildrenFunc;
					}
					ref.hasChildren = true;
					ref.children = [];
				}
				return ref;
			}
			else
				return extName;
		}
	}

	PDPROT.SetMatchingEvents = function (fmObj)
	{
		this.SetNewVarRef(fmObj);
		this.SetMissingMatch(fmObj);
	}

	PDPROT.MatchAction = function (matchObj, status)
	{
		var me = this;
		this.data.IsMatched = (status == 'ok');
		if (this.data.IsMatched)
		{
			if (!this.data.newVars)
				this.data.newVars = [];
			flow.macs.MatchVars(matchObj.varRefs, this.data.newVars, true, this.GetExtPropName());
			this.SetButtonEnabled('okBtn', true, function () { me.OKClick() });
		}
		if (this.owner.CloseMatchDoc)
			this.owner.CloseMatchDoc(this.extIsTarget);
		if (this.onMatchClose)
			this.onMatchClose(status);
	}

	PDPROT.UpdateMacVars = function ()
	{
		var fileVar = null,
			 i, filePrompt, vars = this.action.varsMeta,
			 macVar;
		if ((this.data.activeFileType != 'Macro') &&
			 (this.data.activeFileType != 'none'))
		{
			for (i = 0; i < vars.length; i++)
			{
				macVar = vars[i];
				if ((macVar.name == this.docPathName) &&
					 (macVar.type == 'file'))
				{
					fileVar = macVar;
					break;
				}
			}
			filePrompt = { 'name': this.GetDocPathName(), 'hideForMatch': true, 'type': 'file', 'postfix': 'activex', 'prompt': this.data.promptForDoc,
				'label': this.docLabel, 'val': flow.macs.FixDocRef(this.data.activeDoc), 'pw': false
			};
			if (!fileVar)
				vars.splice(0, 0, filePrompt);
			else
				vars[i] = filePrompt;
		}
		flow.macs.SaveNewMacVars(this.data.newVars, vars, this.extIsTarget, this.GetExtPropName());
		this.data.newVars = []; // clear it...
	}

	PDPROT.OnDocumentReady = function (newName, targetId, asMacroText)
	{
		var me = this;
		if (!asMacroText)
			this.data.activeDoc = newName;
		this.UpdateActiveDocInfo(targetId);
		this.CheckDoc(function (ok)
		{
			if (ok)
				me.ShowMerge();
			else
				me.OnDocumentCleared(targetId);
		});
	}

	PDPROT.ShowMerge = function (fromInit)
	{
		var me = this;
		if (!this.mergeElem)
			this.mergeElem = this.NewDiv('mergeinfo', 'userInput', this.designerForm);
		else
			this.mergeElem.innerHTML = '';
		this.mergeElem.style.width = this.fileElem.style.width;
		if (this.MergeElemExtra)
			this.MergeElemExtra(this.mergeElem);
		this.NewLabel('meInfo', this.docLabel + ' ' + ((this.extIsTarget) ? 'Target' : 'Source') + ' Count=' + this.data.docFieldCount, this.mergeElem);
		this.matchBtn = this.NewDiv('matchBtn', 'matchText', this.mergeElem, '<span>Click to Match Fields:</span> <img src="img/ToVar.png"/>');
		this.matchBtn.onclick = function () { me.OpenMatch() };
		if (!fromInit)
			this.Resize();
	}

	PDPROT.OnDocumentCleared = function (targetId)
	{
		var me = this;
		if (this.mergeElem)
		{
			this.elem.removeChild(this.mergeElem);
			this.mergeElem = null;
		}
		this.data.activeDoc = null;
		this.Resize();
		if (targetId)
			this.UpdateActiveDocInfo(targetId);
		this.SetButtonEnabled('okBtn', true, function () { me.OKClick() });
	}

	PDPROT.FPTypeChanged = function (newType, fromInit)
	{
		var me = this, idx, file, inpElem, url, macrosAt, infoId;
		/*  Following cleared active file selection...
		inpElem = this.designerForm;
		if (inpElem)
		inpElem.reset(); */
		this.data.activeFileType = newType;
		this.getById('spanFPrompt').style.visibility = (newType == 'Macro') ? 'hidden' : 'visible';
		switch (newType)
		{
			case 'Macro':
				this.nfWebElem.style.display = this.nfServerElem.style.display = this.nfPCElem.style.display = 'none';
				this.nfMacroElem.style.display = 'block';
				infoId = 'dmMacroInfo';
				break;
			case 'PC':
				this.nfMacroElem.style.display = this.nfServerElem.style.display = this.nfWebElem.style.display = 'none';
				this.nfPCElem.style.display = 'block';
				infoId = 'dmPCInfo';
				break;
			case 'Server':
				this.nfMacroElem.style.display = this.nfPCElem.style.display = this.nfWebElem.style.display = 'none';
				infoId = 'dmServerInfo';
				fvmCtl.fvm.GetTemplates(this.serverFolder, function (result)
				{
					if (result.status == "ok")
					{
						inpElem = me.getById('dmServerName');
						url = me.htDoc.URL.toLowerCase();
						url = flow.macs.macUri + 'plugins/templates/' + me.serverFolder + '/';
						inpElem.options.length = 0;
						for (idx in result.files)
						{
							file = result.files[idx];
							inpElem.options[inpElem.options.length] = new Option(file.name, url + file.name);
						}
						me.nfServerElem.style.display = 'block';
					}
					else
						alert('Error requesting template folder file list from server: "' + result.message + '"');
				});
				break;
			case 'Web':
				this.nfMacroElem.style.display = this.nfServerElem.style.display = this.nfPCElem.style.display = 'none';
				this.nfWebElem.style.display = 'block';
				infoId = 'dmWebInfo';
				break;
		}
		inpElem = this.getById('dmFT' + newType);
		if (inpElem)
			inpElem.checked = true;
		if (!fromInit)
			this.OnDocumentCleared(infoId);
	}

	PDPROT.UpdateActiveDocInfo = function (targetId)
	{
		if (!targetId)
			targetId = 'dmFileInfo';
		var elem = this.getById(targetId);
		if (elem)
		{
			if (targetId == 'dmMacroInfo')
				elem.innerHTML = 'Current Template: ' + ((this.data.templateText && this.data.templateText != '') ? this.data.templateText.substr(0, 200) + '...' : 'none...');
			else
				elem.innerHTML = 'Current file: ' + ((this.data.activeDoc) ? this.data.activeDoc : 'none...');
		}
	}

	PDPROT.FilePromptIsChecked = function ()
	{
		var cbPromptElem = this.getById('dmFPrompt');
		if (cbPromptElem)
			return cbPromptElem.checked;
		return true;
	}

	PDPROT.NewFilePrompt = function (parent, activeDoc, width, defaultType, offerMacro)
	{
		var me = this,
			 nfElem = this.NewDiv("fpmt", "userInput", parent),
			 t, dmFTElem, inpElem,
			 promptChecked = (this.data.promptForDoc) ? ' checked' : '';
		if (!defaultType)
			defaultType = 'PC';
		this.data.activeFileType = defaultType;
		nfElem.style.height = "7em";
		nfElem.style.width = width;
		nfElem.style.margin = 'auto';
		t = '<label>Template/File Location: </label>';
		t += '<input type="radio" name="dmFType" id="dmFTPC" title="Load from local disk location on your PC" />PC';
		t += '<input type="radio" style="margin-left:2px" name="dmFType" id="dmFTServer" title="Load from a shared folder on Term Server" />Server';
		t += '<input type="radio" style="margin-left:2px" name="dmFType" id="dmFTWeb" title="Load using a complete URL from a Web Location" />Web';
		if (offerMacro)
			t += '<input type="radio" style="margin-left:2px" name="dmFType" id="dmFTMacro" title="Select to Keep Template inside the Macro Script" />Macro';
		t += '<span id="spanFPrompt"><input type="checkbox" style="margin-left:1.5em" name="dmFPrompt" id="dmFPrompt" ';
		t += 'title="When Checked, user sees File Prompt at Runtime for PC types"' + promptChecked + ' />Prompt</span>';
		dmFTElem = this.NewDiv("ftyp", "block", nfElem, t);
		this.getById('dmFT' + defaultType).checked = true;
		this.getById('dmFTServer').onclick = function () { me.FPTypeChanged('Server') };
		this.getById('dmFTPC').onclick = function () { me.FPTypeChanged('PC') };
		this.getById('dmFTWeb').onclick = function () { me.FPTypeChanged('Web') };
		if (offerMacro)
			this.getById('dmFTMacro').onclick = function () { me.FPTypeChanged('Macro') };

		t = '<label style="width:15em;">' + this.docLabel + ' (PC): </label>';
		t += '<input type="file" name="dmPCName" id="dmPCName" style="width:6em" /><br />\n';
		t += '<span id="dmPCInfo" class="small" style="margin:2px">Current file: ' + activeDoc + '</span>';
		this.nfPCElem = this.NewDiv("fpmtPC", "block", nfElem, t);
		this.nfPCElem.style.display = (defaultType == 'PC') ? 'block' : 'none';
		inpElem = this.getById('dmPCName');
		if (inpElem)
		{
			inpElem.onchange = function ()
			{
				me.OnDocumentReady(this.value, 'dmPCInfo');
			};
		}
		t = '<label style="width:15em;">' + this.docLabel + ' (Server): </label><br />';
		t += '<select id="dmServerName" style="margin-left:5em;margin-right:1em;float:left;"></select>\n';
		t += '<a id="btnServerLoad" class="button" style="margin-top:5px" href="#"><span>Load</span></a>';
		t += '<br /><span id="dmServerInfo" class="small" style="margin:2px">Current file: ' + activeDoc + '</span>';
		this.nfServerElem = this.NewDiv("fpmtServer", "block", nfElem, t);
		this.nfServerElem.style.display = (defaultType == 'Server') ? 'block' : 'none';
		inpElem = this.getById('btnServerLoad');
		if (inpElem)
		{
			inpElem.onclick = function ()
			{
				var servElem = me.getById('dmServerName');
				if (servElem)
					me.OnDocumentReady(servElem.options[servElem.selectedIndex].value, 'dmServerInfo');
			};
		}
		t = '<label style="width:15em;">' + this.docLabel + ' (Web): </label><br />';
		t += '<input type="text" style="margin-left:2em;margin-right:1em;float:left;" name="dmWebName" id="dmWebName" size="40" />';
		t += '<a id="btnWebLoad" class="button" href="#"><span>Load</span></a>';
		t += '<br /><span id="dmWebInfo" class="small" style="margin:2px">Current file: ' + activeDoc + '</span>';
		this.nfWebElem = this.NewDiv("fpmtWeb", "block", nfElem, t);
		this.nfWebElem.style.display = (defaultType == 'Web') ? 'block' : 'none';
		inpElem = this.getById('btnWebLoad');
		if (inpElem)
		{
			inpElem.onclick = function ()
			{
				var webElem = me.getById('dmWebName');
				if (webElem)
					me.OnDocumentReady(webElem.value, 'dmWebInfo');
			};
		}

		t = '<label style="width:15em;float:left;margin-right:1.5em;">' + this.docLabel + ' (Macro): </label>';
		t += '<a id="btnMacroEdit" class="button" href="#"><span>Create / Edit</span></a>';
		t += '<br /><span id="dmMacroInfo" class="small" style="margin:2px;width:54em;">Current Macro: ' + this.data.templateText.substr(0, 200) + '...' + '</span>';
		this.nfMacroElem = this.NewDiv("fpmtMacro", "block", nfElem, t);
		this.nfMacroElem.style.display = (defaultType == 'Macro') ? 'block' : 'none';
		if (defaultType == 'Macro')
		{
			this.getById('spanFPrompt').style.visibility = 'hidden';
		}
		inpElem = this.getById('btnMacroEdit');
		if (inpElem)
		{
			inpElem.onclick = function ()
			{
				me.EditMacroTemplate();
			};
		}
		if (defaultType == 'Server') // need to get the list...
			this.FPTypeChanged(defaultType, true);
		return nfElem;
	}

	PDPROT.EditMacroTemplate = function ()
	{
		var me = this;
		this.templateEditor = new flow.macs.TemplateEditor(this, this.htDoc, this, 'Edit In-Macro ' + this.docLabel, this.data.templateText);
		this.templateEditor.Display(function (obj, action)
		{
			if (action == 'ok')
			{
				me.data.templateText = obj.templateText;
				me.UpdateActiveDocInfo('dmMacroInfo');
				me.OnDocumentReady(null, 'dmMacroInfo', true);
			}
		});
	}

	PDPROT.OKClick = function ()
	{
		var me = this;
		this.CheckDoc(function (ok) { me.FinishDesigner(ok); });
	}

	PDPROT.GetDataInitCode = function ()
	{
		return null;
	}
	//-------------------- NewVar Class
	flow.macs.PluginNewVar = function (htDoc, runtime, parent, varRef, extDef, existingVar,
													extIsTarget, asChild, id, title)
	{
		if (!htDoc)
			return;
		flow.macs.DynWin.call(this, htDoc, parent, asChild);
		this.SetVarValues(varRef, extDef, existingVar, title);
		if (!id)
			id = 'plugin_newVar';
		this.extIsTarget = (extIsTarget);
		this.asChild = asChild;
		this.source = (extIsTarget) ? 'user' : 'plugin';
		this.modal = (asChild) ? false : true;
		this.init(id, this.title, this.modal, this.GetNewZIndex(parent));
		this.runtime = runtime;
	}
	flow.macs.PluginNewVar.prototype = new flow.macs.DynWin();
	var NVPROT = flow.macs.PluginNewVar.prototype; //convenience
	NVPROT.constructor = flow.macs.PluginNewVar;

	NVPROT.SetVarValues = function (varRef, extDef, existingVar, title)
	{
		this.varRef = varRef;
		this.extDef = extDef;
		this.existingVar = existingVar;
		if (!title)
		{
			var matchDesc = (extDef) ? 'Matched to ' + extDef.name : 'Not Currently Matched';
			if (existingVar)
				title = 'Update the Field and/or Value Named ' + existingVar.name + ' ' + matchDesc;
			else
				title = 'Define a new Field and/or Value ' + matchDesc;
			this.title = title;
		}
		else
			this.title = title;
	}

	NVPROT.OKClick = function ()
	{
		var newVar = new Object;
		newVar.type = (this.source == 'user') ? 'prompt' : this.source;
		newVar.name = flow.macs.FieldNameFromLabel(this.getById('npVarName', 'value'));
		newVar.val = this.getById('npVarValue', 'value');
		newVar.source = this.source;
		if (this.source == 'user')
		{
			newVar.label = this.getById('npVarLabel', 'value');
			newVar.title = this.getById('npVarTitle', 'value');
		}
		this.BtnAction('ok', newVar);
	}

	NVPROT.SourceClicked = function (source)
	{
		if (this.source != source)
		{
			this.source = source;
			if (this.source == 'user')
				this.AddDetailsElem();
			this.Resize();
		}
	}

	NVPROT.AddDetailsElem = function (initializing)
	{
		if (this.detailsElem)
			return;
		var t = '<form class="pform" action="#" style="width:30em;min-width:30em;" method="post" id="npform2" name="npform2">',
			 label, title, formElem, me = this;
		label = title = this.getById('npVarName', 'value');
		if (this.existingVar)
		{
			if (this.existingVar.label)
				label = this.existingVar.label;
			if (this.existingVar.title)
				title = this.existingVar.title;
		}

		t += '<label class="narrow">Label: </label>';
		t += '<input type="text" name="npVarLabel" value="' + label + '" id="npVarLabel" style="width:10em" /><br />\n';
		t += '<label class="narrow">Title/Description: </label>';
		t += '<input type="text" name="npVarTitle" value="' + title + '" id="npVarTitle" style="width:15em" /><br />\n';
		t += '</form>';
		this.detailsElem = this.NewDiv('npDet', 'userInput', this.elem, t);
		if (!initializing)
		{
			try { this.getById('npVarLabel').focus(); } catch (e) { }
		}
		formElem = this.getById('npform2');
		if (formElem)
			formElem.onkeydown = function (event) { me.CheckEnterKey(event) };
	}

	NVPROT.Display = function (onClose)
	{
		var me = this, t, name, value;
		this.onClose = onClose;
		this.titleElem = this.NewDiv('title', 'title', this.elem, this.title);
		if (this.existingVar)
		{
			name = this.existingVar.name;
			value = this.existingVar.val;
		}
		else
		{
			name = this.extDef.name;
			value = '';
		}
		this.CreateTopElem('np', 'Name', name, value, true);
		if (this.source == 'user')
			this.AddDetailsElem(true);
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

	NVPROT.CreateTopElem = function (np, nameLabel, name, value, hasValue)
	{
		var me = this, formElem, sourceAdded = false, varSrc, srcobj, rbElem, varSourceList = this.varSourceList,
			t = '<form class="pform" action="#" style="width:30em;min-width:35em;" method="post" id="' + np + 'form" name="' + np + 'pform">';
		if (!varSourceList)
			varSourceList = flow.macs.varSourceList;
		t += '<label class="narrow" style="width:7em">' + nameLabel + ': </label>';
		t += '<input type="text" name="' + np + 'VarName" id="' + np + 'VarName" style="width:15em" value="' + name + '" /><br />\n';
		if (this.extIsTarget)
		{
			if (hasValue)
			{
				if (!value)
					value = '';
				t += '<label class="narrow">Value: </label>';
				t += '<input type="text" name="' + np + 'VarValue" id="' + np + 'VarValue" value="' + value + '" style="width:20em" /><br />\n';
			}
			for (varSrc in varSourceList)
			{
				srcobj = varSourceList[varSrc];
				if (typeof (srcobj) == 'function')
					continue;
				if (!sourceAdded)
				{
					t += '<label class="narrow">Source: </label>';
					sourceAdded = true;
				}
				t += '<input type="radio" value="' + varSrc + '" name="' + np + 'rbSource" title="' + srcobj.title + '" id="' + np + 'RB' + varSrc + '" /> ' + srcobj.text;
			}
		}
		t += '</form>';
		this.topElem = this.NewDiv(np + 'Top', 'userInput', this.elem, t);
		formElem = this.getById(np + 'form');
		if (formElem)
			formElem.onkeydown = function (event) { me.CheckEnterKey(event || window.event) };
		try { this.getById(np + 'VarName').focus(); } catch (e) { }
		if (this.extIsTarget)
		{
			for (varSrc in varSourceList)
			{
				rbElem = this.getById(np + 'RB' + varSrc);
				if (rbElem)
					rbElem.onclick = function () { me.SourceClicked(this.value) };
			}
		}
		rbElem = null; // clear for set logic...
		if (this.existingVar)
		{
			this.source = this.existingVar.source;
			if (this.extIsTarget)
			{
				rbElem = this.getById(np + 'RB' + this.source);
				if (rbElem)
					rbElem.checked = true;
			}
		}
		if (this.extIsTarget && !rbElem)
		{
			// check the first one found...check for defaultSource
			for (varSrc in varSourceList)
			{
				rbElem = this.getById(np + 'RB' + varSrc);
				if (rbElem)
				{
					if (!this.defaultSource ||
						 (varSrc == this.defaultSource))
					{
						rbElem.checked = true;
						this.source = varSrc;
						break;
					}
				}
			}
		}
	}

	NVPROT.Resize = function ()
	{
		this.height = this.width = 0;
		this.SetLocation(this.titleElem, 0, 5);
		this.SetLocation(this.topElem, 0, 5);
		if (this.source == 'user')
		{
			this.detailsElem.style.visibility = 'visible';
			this.SetLocation(this.detailsElem, 0, 5);
		}
		else if (this.detailsElem)
			this.detailsElem.style.visibility = 'hidden';
		if (this.actionsElem)
			this.SetLocation(this.actionsElem, 0, 5);
		this.width += 8;
		this.Center(this.titleElem);
		if (this.actionsElem)
			this.Center(this.actionsElem);
		this.Show(this.onClose);
	}

	//-------------------- NewVarGroup Class
	flow.macs.PluginNewVarGrp = function (htDoc, runtime, parent, varRef, extDef, existingVar, extIsTarget, genChildren)
	{
		var title, matchDesc = (extDef) ? 'Matched to ' + extDef.name : 'Not Currently Matched';
		if (existingVar)
			title = 'Update the Macro Variable Array Named ' + existingVar.name + ' ' + matchDesc;
		else
			title = 'Define a new Macro Variable Array ' + matchDesc;
		flow.macs.PluginNewVar.call(this, htDoc, runtime, parent, varRef, extDef, existingVar,
				extIsTarget, false, 'npGrp', title);
		this.genChildren = (genChildren) ? true : false;
		if (genChildren)
		{
			this.extChildren = extDef.children;
			this.childIndex = 0;
			this.children = [];
		}
	}
	flow.macs.PluginNewVarGrp.prototype = new flow.macs.PluginNewVar();
	var PGPROT = flow.macs.PluginNewVarGrp.prototype; //convenience
	PGPROT.constructor = flow.macs.PluginNewVarGrp;

	PGPROT.OKClick = function ()
	{
		var newVarRef = new Object;
		if (this.varWin)
			this.varWin.OKClick(); // save any changes...

		newVarRef.type = this.source;
		newVarRef.name = this.getById('npgVarName', 'value');
		newVarRef.source = this.source;
		if (this.genChildren)
			newVarRef.children = this.CreateChildren();
		else
			newVarRef.children = [];
		newVarRef.newChildren = [];
		this.BtnAction('ok', newVarRef);
	}

	PGPROT.CreateChildren = function ()
	{
		var i, varRef, children = [];
		for (i = 0; i < this.extChildren.length; i++)
		{
			varRef = this.GetChild(i);
			children.push(varRef);
		}
		return children;
	}

	PGPROT.GetChild = function (i)
	{
		var varRef, extDef;
		if (i < this.children.length)
			varRef = this.children[i];
		else
		{
			extDef = this.extChildren[i];
			varRef = { 'name': flow.macs.FieldNameFromLabel(extDef.name) };
			extDef.linkedTo = varRef;
			varRef.linkedTo = extDef;
			if (!this.extIsTarget)
				varRef.source = 'plugin';
			else
			{
				varRef.source = this.source;
				if (extDef.sampleValue)
					varRef.val = extDef.sampleValue;
			}
			this.children[i] = varRef;
		}
		return varRef;
	}

	PGPROT.Display = function (onClose)
	{
		var me = this, t, name, formElem, i, extDef, listElem;
		this.onClose = onClose;
		this.elem.style.width = '35em';
		this.titleElem = this.NewDiv('title', 'title', this.elem, this.title);
		if (this.existingVar)
			name = this.existingVar.name;
		else
			name = flow.macs.FieldNameFromLabel(this.extDef.name);

		this.varSourceList = flow.macs.GetVarSourceListCopy('screen,plugin');
		this.CreateTopElem('npg', 'Group Name', name, null, false);
		if (this.genChildren)
		{
			this.bodyElem = this.NewDiv('bodyElem', 'container', this.elem);
			this.listElem = this.NewDiv('list', 'list', this.bodyElem);
			this.listElem.style.fontSize = '1.0em';
			this.listElem.style.height = "15em";
			for (i = 0; i < thiss.extChildren.length; i++)
			{
				extDef = this.extChildren[i];
				listElem = this.NewDiv('extCh' + i, 'listElem', this.listElem, flow.macs.FieldNameFromLabel(extDef.name));
				listElem.onclick = function () { me.ShowChildVar(parseInt(this.id.substring(14)), true) };
			}
			this.ShowChildVar(this.childIndex);
		}
		this.actionsElem = this.NewDiv('actions', 'actions', this.elem);
		this.okBtn = this.NewButton('okBtn', 'OK', this.actionsElem);
		this.okBtn.onclick = function () { me.OKClick() };
		this.cancelBtn = this.NewButton('canBtn', 'Cancel', this.actionsElem);
		this.cancelBtn.onclick = function () { me.BtnAction('cancel') };
		this.Resize();
	}

	PGPROT.ShowChildVar = function (index, asUpdate)
	{
		var varRef, created = (index >= this.children.length),
			me = this;

		if (asUpdate && this.varWin)
			this.varWin.OKClick();

		varRef = this.GetChild(index);
		this.childIndex = index;
		if (this.varWin)
		{
			this.varWin.SetVarValues(varRef, this.extChildren[index], varRef);
		}
		else
		{
			this.varWin = new flow.macs.PluginNewVar(this.htDoc, this.runtime, this.bodyElem, varRef, this.extChildren[index], varRef, this.extIsTarget, true);
			this.varWin.elem.style.fontSize = '1.0em';
			this.varWin.elem.style.position = 'relative';
			this.varWin.elem.style.left = '0px';
			this.varWin.elem.style.top = '0px';
		}
		this.varWin.varSourceList = flow.macs.GetVarSourceListCopy(this.source + ',constant');
		this.varWin.Display(function (newVarRef, msg)
		{
			me.EditChildOnUpdate(newVarRef, msg)
		});
	}

	PGPROT.Resize = function ()
	{
		this.height = this.width = 0;
		this.SetLocation(this.titleElem, 0, 5);
		this.SetLocation(this.topElem, 0, 5);
		if (this.bodyElem)
		{
			this.bodyElem.style.width = (this.listElem.offsetWidth + this.varWin.elem.offsetWidth + 10) + 'px';
			this.SetLocation(this.bodyElem, 0, 5);
		}
		this.SetLocation(this.actionsElem, 0, 5);
		this.width += 8;
		this.Center(this.titleElem);
		this.Center(this.actionsElem);
		this.Show(this.onClose);
	}

	PGPROT.EditChildOnUpdate = function (newVarRef, msg)
	{
		if (msg == 'ok')
		{
			var varRef = this.children[this.childIndex];
			if (newVarRef.type)
				varRef.type = newVarRef.type;
			varRef.name = newVarRef.name;
			varRef.val = newVarRef.val;
			varRef.source = newVarRef.source;
			if (newVarRef.source == 'user')
			{
				varRef.label = newVarRef.label;
				varRef.title = newVarRef.title;
			}
		}
		return true;
	}

} ());

