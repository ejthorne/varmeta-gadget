// FV Macro Management
// Module Pattern for best performance and non-global vars
(function ()
{
	//NAMESPACE
	if (!window.flow)
		window.flow = {};
	if (!flow.macs)
		flow.macs = {};

	// Static methods
	flow.macs.FixDocRef = function (docPath)
	{
		return docPath.replace(/\\/g, '/');
	}

	flow.macs.GetFileRef = function (docPath)
	{
		return ((docPath.substr(0, 5).toLowerCase() == 'http:') ? '' : 'file:///') + docPath.replace(/\\/g, '/');
	}

	flow.macs.trim = function (stringToTrim)
	{
		return stringToTrim.replace(/^\s+|\s+$/g, "");
	}

	flow.macs.Login = function ()
	{
		var t = '<form id="MacLogon" onsubmit="return false" href="#">',
			elem, okBtnElem, cnBtnElem, formElem, me = this, pw;
		t += 'Admin Password:&nbsp;<input type="password" name="pw" id="admPW" /><br />';
		t += '<span style="font-size:0.8em;margin-left:10em">Host name: ' + hostName + '</span><br />';
		t += '<input type="button" id="mclCancel" value="Cancel" style="float:right;"/>';
		t += '<input type="button" id="mclOK" value="OK" style="margin-right:1em;float:right;"/></form>';
		elem = document.createElement('div');
		elem.className = "dynWin";
		elem.style.background = '#bbbbbb';
		elem.style.top = '0.5em';
		elem.style.left = '3em';
		elem.style.width = '20em';
		elem.style.height = '4em';
		document.body.appendChild(elem);
		elem.innerHTML = t;
		okBtnElem = document.getElementById('mclOK');
		cnBtnElem = document.getElementById('mclCancel');
		pw = document.getElementById('admPW');
		elem.onkeydown = function (e)
		{
			var action = flow.macs.CheckEnterKey(document, e);
			if (!action)
				return true;
			if (action == 'ok')
			{
				okBtnElem.onclick();
			}
			else
				cnBtnElem.onclick();
			return false;
		};
		if (pw)
		{
			try { pw.focus(); } catch (e) { }
		}
		if (cnBtnElem)
		{
			cnBtnElem.onclick = function ()
			{
				document.body.removeChild(elem);
			};
		}
		if (okBtnElem)
		{
			okBtnElem.onclick = function ()
			{
				if (pw)
				{
					fvm.AxCall("AdminLogon&adminPW=" + pw.value,
				function (oxh)
				{
					var info = (oxh.data) ? oxh.data : eval('(' + oxh.responseText + ')');
					if (info.status == "ok")
					{
						fvm.secToken = info.token;
						fvm.isAuthor = true;
						SetUserMode("Admin");
					}
					else
					{
						alert('Invalid Administrator Password for Host ' + hostName);
						fvm.secToken = null;
						SetUserMode();
					}
				});
				}
				document.body.removeChild(elem);
			};
		}
	}

	// standard data source types
	flow.macs.varSourceList = {
		'user': { 'text': 'User',
			'title': 'Entered by User in Prompt'
		},
		'plugin': { 'text': 'Work',
			'title': 'To be used as working variable / target for another plug-in connection...'
		},
		'constant': { 'text': 'Hard-coded',
			'title': 'Hard-coded Value'
		},
		'screen': { 'text': 'Screen Read',
			'title': 'Read from a screen (will need assignment)'
		}
	};

	flow.macs.GetVarSourceListCopy = function (filter)
	{
		var srcList = {},
			 prop;
		for (prop in flow.macs.varSourceList)
		{
			if (!filter ||
				 (filter.indexOf(prop) != -1))
				srcList[prop] = flow.macs.varSourceList[prop];
		}
		return srcList;
	}

	flow.macs.FieldNameFromLabel = function (label)
	{
		var name = label.replace(/[^a-zA-Z 0-9]+/g, ''),
		 s = "",
		state = 0, c;
		// now upper/lower case it
		if ("0123456789".indexOf(name.substr(0, 1)) != -1)
			name = 'F' + name;
		for (c = 0; c <= name.length; c++)
		{
			switch (state)
			{
				case 0:
					if (name.charAt(c) == ' ')
						continue;
					s += name.charAt(c).toUpperCase();
					state = 1;
					break;
				case 1:
					if (name.charAt(c) == ' ')
						state = 0;
					else
						s += name.charAt(c).toLowerCase();
					break;
			}
		}
		return s;
	}

	// A little recursion to end the day :)
	flow.macs.loadScripts = function (urls, index)
	{
		if (index >= urls.length)
			return;
		flow.macs.loadScript(urls[index],
			function () { flow.macs.loadScripts(urls, index + 1) });
	}

	flow.macs.loadScript = function (url, callback)
	{
		// Thanks NCZOnline
		var script = document.createElement("script")
		script.type = "text/javascript";
		script.src = url;
		if (callback)
		{
			if (script.readyState)
			{  //IE
				script.onreadystatechange = function ()
				{
					if (script.readyState == "loaded" ||
							  script.readyState == "complete")
					{
						script.onreadystatechange = null;
						callback();
					}
				};
			} else
			{  //Others
				script.onload = function ()
				{
					callback();
				};
			}
		}
		document.getElementsByTagName("head")[0].appendChild(script);
	}

	flow.macs.CheckEnterKey = function (htDoc, e)
	{
		var win = htDoc.defaultView || htDoc.parentWindow;
		var evt = (e) ? e : (win.event) ? win.event : null,
				 key, ret;
		if (evt)
		{
			key = (evt.charCode) ? evt.charCode :
					((evt.keyCode) ? evt.keyCode : ((evt.which) ? evt.which : 0));

			if ((key == 13) ||
				    (key == 27))
			{
				if (key == 13)
					ret = 'ok';
				else
					ret = 'cancel';
				evt.cancelBubble = true;
				if (evt.stopPropagation) evt.stopPropagation();
				if (evt.preventDefault) evt.preventDefault();
				evt.returnValue = false;
				return ret;
			}
		}
		return null;
	}

	flow.macs.CancelEv = function (e)
	{
		if (e.stopPropagation)
			e.stopPropagation();
		if (e.preventDefault)
			e.preventDefault();
		else
			e.cancelBubble = true;
		e.returnValue = false;
		return false;
	}

	flow.macs.GetEvTarget = function (e)
	{
		var targ;
		if (!e) var e = window.event;
		if (e.target) targ = e.target;
		else if (e.srcElement) targ = e.srcElement;
		if (targ.nodeType == 3) // defeat Safari bug
			targ = targ.parentNode;
		return targ;
	}

	var AxInitOK = false;
	//---------------------Macros Runtime Class -----------------------------
	flow.macs.Runtime = function (termW, fvmCtl)
	{
		var me = this;
		var urlr = location.protocol + "//" + location.host + location.pathname;
		var parts = urlr.split("/");
		this.server = urlr.substr(0, urlr.length - parts[parts.length - 1].length);
		this.axq = new Array();
		this.AxCall = this.AxCaller;
		this.mimeType = "text/plain";
		this.queued = true;
		this.termW = termW;
		this.fvmCtl = fvmCtl;
		this.userID = "!";
		this.activeMacro = null;
		this.recording = false;
		this.keepEditor = true;
		this.plugins = {};
		this.logicPlugins = {};
		this.designPlugins = {};

		if (typeof (emEvents) != 'undefined')
			emEvents.RegisterClient(this, "macros");
		if (!AxInitOK)
		{
			AxInitOK = this.AxOK = this.AxInit();
		}
		if (typeof (this.OnNewEm) != 'undefined')
		{
			if (!termW)
				this.OnNewEm(null);
			else
				this.OnNewEm(termW.em);
		}
		this.AxCall("getplugins",
		function (oxh)
		{
			me.AddPlugins((oxh.data) ? oxh.data : eval('(' + oxh.responseText + ')'));
		});
	}

	var RTPROT = flow.macs.Runtime.prototype; //convenience

	RTPROT.AddPlugins = function (result)
	{
		var me = this;
		if (result.status == 'error')
		{
			alert("AddPlugins Error: " + result.message);
			result.files = [];
		}
		this.plugInList = result.files;
		this.plugInsLoaded = 0;
		var urls = new Array();
		if (result.files.length > 0)
		{
			if (result.files[0].name.indexOf('-min') != -1)
			{
				urls.push(flow.macs.macUri + 'MacDesign-min.js');
			}
			else
			{
				urls.push(flow.macs.macUri + 'DynWin.js');
				urls.push(flow.macs.macUri + 'Plugin.js');
				urls.push(flow.macs.macUri + 'DragMgr.js');
				urls.push(flow.macs.macUri + 'FieldMatcher.js');
			}
		}
		for (var idx in result.files)
		{
			var file = result.files[idx];
			urls.push(flow.macs.macUri + 'Plugins/' + file.name + '.js');
		}
		flow.macs.loadScripts(urls, 0);
	}

	RTPROT.AddPlugin = function (func, type, id, icon, title, action, initProps)
	{
		try
		{
			var plugin;
			if (!type)
				type = 'ext';
			switch (type)
			{
				case 'ext':
					plugin = new func(this);
					this.plugins[plugin.id] = plugin;
					break;
				case 'logic':
					plugin = { "newFunc": func, "id": id, "title": title, "icon": icon, "action": action, "initProps": initProps };
					this.logicPlugins[plugin.id] = plugin;
					break;
				case 'design':
					plugin = { "newFunc": func, "id": id };
					this.designPlugins[plugin.id] = plugin;
					break;
				default:
					throw new Error('Plugin type "' + type + '" not recognized as a supported plugin type');
			}
		}
		catch (e)
		{
			alert('Error in flow.macs.Runtime.AddPlugin: ' + e.message);
		}
	}

	RTPROT.GetDesigner = function (id)
	{
		return this.designPlugins[id];
	}

	RTPROT.GetAction = function (id)
	{
		return this.logicPlugins[id];
	}

	RTPROT.GetActions = function (filters)
	{
		var id, ok, omit = null, include = null, actions = [];
		if (filters)
		{
			if (filters.include)
				include = filters.include;
			if (filters.omit)
				omit = filters.omit;
		}
		for (id in this.logicPlugins)
		{
			if (!this.logicPlugins[id].action)
				continue;
			ok = false;
			if (!include || include[id])
				ok = true;

			if (omit && filters.omit[id])
				ok = false;

			if (ok)
				actions.push(this.logicPlugins[id]);
		}
		return actions;
	}


	RTPROT.GetPluginList = function (includeSources, includeTargets)
	{
		var ret = new Array();
		for (var pluginid in this.plugins)
		{
			var plugin = this.plugins[pluginid];
			if ((includeSources &&
				  plugin.IsSource) ||
				 (includeTargets &&
				  plugin.IsTarget))
				ret.push({ 'instance': -1, 'plugin': plugin });
		}
		return ret;
	}

	RTPROT.GetPlugin = function (pluginId)
	{
		return this.plugins[pluginId];
	}

	RTPROT.StartMacro = function (name, pub, keepEditor)
	{
		var me = this;
		this.keepEditor = keepEditor;
		this.AxCall("get&name=" + name + "&pub=" + pub,
		function (oxh)
		{
			me.RunMacro(name, (oxh.data) ? oxh.data.macroText : oxh.responseText, pub);
		});
	}

	RTPROT.SetActiveMacro = function (name, macroCode, pub)
	{
		this.activeMacroName = name;
		this.activeMacroCode = macroCode;
		this.activeMacroIsPub = pub;
	}

	RTPROT.InitMacro = function ()
	{
		//TODO init environment...
	}

	RTPROT.RunMacro = function (name, macroCode, pub)
	{
		this.InitMacro();
		this.macParmValues = { "parms$Ready": false };
		this.ParameterInfo = null;
		this.templateText = null; // for macros using Mustache templates
		this.templatePath = null; // for macros using Mustache templates
		this.SetActiveMacro(name, macroCode, pub);
		var funcName = name.replace(/^\w\d\s/g, '').replace(/\s/g, '_'),
			 t = 'this._Run' + funcName + '=function (runtime) {\n  flow.macs.FlowMacro.call(this,runtime);\n';
		t += macroCode + '}\n;'
		t += 'this._Run' + funcName + '.prototype = new flow.macs.FlowMacro();\r\n';
		t += 'this._Run' + funcName + '.prototype.constructor = this._Run' + funcName + ';\r\n';
		t += 'this.activeMacro=new this._Run' + funcName + '(this);\r\n';
		eval(t);
		this.ActiveMacroRun();
	}

	RTPROT.ActiveMacroRun = function ()
	{
		try
		{
			this.activeMacro.Run();
		}
		catch (e)
		{
			this.ActiveMacroExcp(e);
		}
	}

	RTPROT.ActiveMacroExcp = function (e)
	{
		if (e)
		{
			alert("Macro '" + this.activeMacroName + "' Execution Error=" + e.message)
			this.EndMacro();
		}
	}

	RTPROT.RestartMacro = function (endMessage)
	{
		var me = this;
		this.macParmValues.parms$Ready = false;
		this.InitMacro();
		window.setTimeout(function () { me.ActiveMacroRun() }, 1);
	}

	RTPROT.EndMacro = function (alertText)
	{
		if (alertText)
			fvmCtl.FlashMessage(alertText, 2000);
		this.activeMacro = null;
	}

	RTPROT.GetUserInfo = function (callBack)
	{
		var me = this; //need for callback to have object context
		this.AxCall("getuser",
		function (oxh)
		{
			var info = (oxh.data) ? oxh.data : eval('(' + oxh.responseText + ')');
			if (info.status == "ok")
			{
				me.userID = info.userID;
			}
			else
			{
				me.userID = "!";
			}
			if (callBack)
			{
				try { callBack(info); } catch (e) { }
			}
		});
	}

	RTPROT.GetTemplates = function (serverFolder, callBack)
	{
		this.AxCall("gettemplates&folder=" + serverFolder,
		function (oxh)
		{
			callBack((oxh.data) ? oxh.data : eval('(' + oxh.responseText + ')'));
		});
	}

	RTPROT.GetList = function (callBack)
	{
		this.AxCall("list",
		function (oxh)
		{
			callBack((oxh.data) ? oxh.data : eval('(' + oxh.responseText + ')'));
		});
	}

	RTPROT.GetMacro = function (name, pub, lockPW, callBack)
	{
		this.AxCall("get&name=" + name + "&pub=" + pub + ((lockPW) ? "&lockPW=" + lockPW : ""),
		function (oxh)
		{
			callBack((oxh.data) ? oxh.data.macroText : oxh.responseText);
		});
	}

	RTPROT.GetDesign = function (name, pub, lockPW, callBack)
	{
		this.AxCall("getDesign&name=" + name + "&pub=" + pub + ((lockPW) ? "&lockPW=" + lockPW : ""),
		function (oxh)
		{
			callBack((oxh.data) ? oxh.data.macroText : oxh.responseText);
		});
	}

	RTPROT.SaveMacro = function (name, text, pub, designJson)
	{
		this.AxCall("save&name=" + name + "&pub=" + pub,
		function (oxh)
		{
			var status = (oxh.data) ? oxh.data.status : oxh.responseText;
			var message = (oxh.data) ? oxh.data.message : oxh.responseText;
			if (status != "ok")
				alert("SaveMacro Error!  Error Text=" + message);
		}, "macro=" + encodeURIComponent(text) + ((designJson) ? "&design=" + encodeURIComponent(designJson) : ''));
	}

	RTPROT.RenameMacro = function (name, newName, pub)
	{
		this.AxCall("rename&name=" + name + "&newName=" + newName + "&pub=" + pub,
		function (oxh)
		{
			var status = (oxh.data) ? oxh.data.status : oxh.responseText;
			var message = (oxh.data) ? oxh.data.message : oxh.responseText;
			if (status != "ok")
				alert("RenameMacro Error!  Error Text=" + message);
			else
				macroName = newName;
		});
	}

	RTPROT.DeleteMacro = function (name, pub, retCode)
	{
		var retFunc = retCode;
		this.AxCall("delete&name=" + name + "&pub=" + pub,
		function (oxh)
		{
			var status = (oxh.data) ? oxh.data.status : oxh.responseText;
			var message = (oxh.data) ? oxh.data.message : oxh.responseText;
			if (status != "ok")
				alert("DeleteMacro Error!  Error Text=" + message);
			else
			{
				retFunc();
			}
		});
	}

	RTPROT.AxCaller = function (action, fnReady, body, mimeType)
	{
		var path, url,
			 oXH = null, fvm = this,
			 actionCmd, ampAt;
		if (is_ipad)
			CancelSync();
		if (this.queued)
			this.AxCall = this.AxCallQ;
		if (!fnReady)
			fnReady = function (oxh) { };
		try
		{
			if (action.charAt(0) == '*') // rest of action is the URL
				url = action.substr(1);
			else
			{
				if (flow.macs.callStyle == 'path')
				{
					ampAt = action.indexOf('&');
					if (ampAt != -1)
						actionCmd = '/' + action.substr(0, ampAt) + '?' + action.substr(ampAt + 1);
					else
						actionCmd = '/' + action;
				}
				else
					actionCmd = '?action=' + action;

				url = encodeURI(flow.macs.callUri + actionCmd + '&urlTwirl=' + Math.random());
			}

			if ((typeof (gadgets) != 'undefined') &&
					gadgets.io && gadgets.io.makeRequest)
			{
				var params = {};
				params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.JSON;
				if (body)
				{
					params[gadgets.io.RequestParameters.METHOD] = gadgets.io.MethodType.POST;
					params[gadgets.io.RequestParameters.POST_DATA] = body;
				}
				gadgets.io.makeRequest(url, fnReady, params);
			}
			else
			{
				// Since ie7 has native xmlhttprequest...
				if (window.XMLHttpRequest)
				{
					// If IE7, Mozilla, Safari, etc: Use native object
					oXH = new XMLHttpRequest()
					if (oXH.overrideMimeType)
						oXH.overrideMimeType((mimeType) ? mimeType : this.mimeType);
				}
				else
				{
					// ...otherwise, use the ActiveX control for IE5.x and IE6
					oXH = new ActiveXObject(XmlHttpObject);
				}

				oXH.open((body) ? "POST" : "GET", url, true);
				oXH.onreadystatechange = function ()
				{
					if (oXH.readyState == 4)
					{
						fnReady(oXH);
						fvm.AxNextCall();
					}
				}

				if (body)
				{
					oXH.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
					oXH.setRequestHeader("Content-length", body.length);
					oXH.setRequestHeader("Connection", "close");
				}
				oXH.send(body);
			}
		}
		catch (e)
		{
			fvm.AxNextCall();
			throw (e);
		}
	}

	RTPROT.AxNextCall = function ()
	{
		if (this.axq.length == 0)
		{
			this.AxCall = this.AxCaller
			return;
		}
		var axnext = this.axq.shift(); // get first element in queue array
		this.AxCaller(axnext.action, axnext.fnReady, axnext.body, axnext.mimeType);
	}

	RTPROT.AxCallQ = function (action, fnReady, body, mimeType)
	{
		if (!mimeType)
			mimeType = this.mimeType;
		this.axq.push({ "action": action, "fnReady": fnReady, "body": body, "mimeType": mimeType });
	}

	RTPROT.AxInit = function ()
	{
		var oXH = null;
		var ok = false;
		var XmlLoadError;

		if (window.XMLHttpRequest)
		{
			this.XmlHttpObject = "XMLHttpRequest (IE7+/Safari/Mozilla)";
			this.XmlDomDocument = "W3C";
			return true;
		}
		if (!window.ActiveXObject)
			return false;

		this.XmlDomDocument = "MSXML2.DOMDocument.4.0";
		this.XmlHttpObject = "Msxml2.XMLHTTP.4.0";
		try
		{
			oXH = new ActiveXObject(this.XmlHttpObject);
			ok = true;
		}
		catch (e)
		{
			this.XmlLoadError = e.message;
			ok = false;
		}
		if (ok)
		{
			this.XmlDomDocument = "MSXML2.DOMDocument.4.0";
			oXH = null;
			return ok;
		}
		this.XmlHttpObject = "Msxml2.XMLHTTP.3.0";
		try
		{
			oXH = new ActiveXObject(this.XmlHttpObject);
			ok = true;
		}
		catch (e)
		{
			this.XmlLoadError = e.message;
			ok = false;
		}
		if (ok)
		{
			this.XmlDomDocument = "MSXML2.DOMDocument.3.0";
			oXH = null;
			return ok;
		}
		this.XmlHttpObject = "Msxml2.XMLHTTP";
		try
		{
			oXH = new ActiveXObject(this.XmlHttpObject);
			ok = true;
		}
		catch (e)
		{
			this.XmlLoadError = e.message;
			ok = false;
		}
		if (ok)
		{
			this.XmlDomDocument = "MSXML2.DOMDocument";
			oXH = null;
			return ok;
		}
		this.XmlHttpObject = "Microsoft.XMLHTTP";
		try
		{
			oXH = new ActiveXObject(this.XmlHttpObject);
			ok = true;
		}
		catch (e)
		{
			this.XmlLoadError = e.message;
			ok = false;
		}
		if (ok)
		{
			oXH = null;
			this.XmlDomDocument = "Microsoft.XMLDOM";
			return ok;
		}
		return false;
	}
} ());

