// FV Macro Management
// Module Pattern for best performance and non-global vars
(function ()
{
	//NAMESPACE
	if (!window.flow)
		window.flow = {};
	if (!flow.macs)
		flow.macs = {};
	flow.macs.macUri = './';
	flow.macs.callUri = './FlowMacros.aspx';
	flow.macs.callStyle = 'qs';   // set to 'path' for included in path, qs for querystring arg
	flow.macs.screensActive = false;

	flow.macs.GetViewPort = function (win, doc)
	{
		var vp = { width: 0, height: 0 };
		if (!win)
			win = window;
		if (!doc)
			doc = document;
		if (typeof (win.innerWidth) == 'number')
		{
			//Non-IE
			vp.width = win.innerWidth;
			vp.height = win.innerHeight;
		} else if (doc.documentElement && (doc.documentElement.clientWidth || doc.documentElement.clientHeight))
		{
			//IE 6+ in 'standards compliant mode'
			vp.width = doc.documentElement.clientWidth;
			vp.height = doc.documentElement.clientHeight;
		} else if (doc.body && (doc.body.clientWidth || doc.body.clientHeight))
		{
			//IE 4 compatible
			vp.width = doc.body.clientWidth;
			vp.height = doc.body.clientHeight;
		}
		return vp;
	}

	flow.macs.CheckScrollBug = function ()
	{
		if (window.scrollY)
		{
			window.scrollTo(0, 0);
		}
		else if (main.screenTop &&
					(main.screenTop != 0))
		{
			window.scrollTo(0, 0);
		}
	}

	// Macro Control
	flow.macs.FVMControl = function (termW)
	{
		this.fvm = null;
		this.termW = termW;
		this.winActive = false;
		this.win = null;
		this.recording = false;
		this.macDoc = null;
		this.widthElemID = null;
		this.heightElemID = null;
		this.FVMGet = function ()
		{
			if (this.fvm == null)
			{
				this.macIcon = document.getElementById('macIcon');
				this.GetMacIconLoc();
				if (!flow || !flow.macs ||
					(typeof (flow.macs.Runtime) == 'undefined'))
				{
					alert("Sorry, the Flynet Viewer Macro Management Javascript is not activated in this Emulation Environment");
				}
				else
					this.fvm = new flow.macs.Runtime(main, this)
			}
		}
		this.RecKey = function (key, type)
		{
			if (this.recording)
				this.fvm.RecKey(key, type);
		}
	}

	var MCPROT = flow.macs.FVMControl.prototype; // convenience

	MCPROT.MoveOpenWindow = function ()
	{
		if (this.winActive)
		{
			this.SizeWinPageTo();
		}
	}

	MCPROT.CloseAll = function ()
	{
		var me = this;
		window.setTimeout(function () { me.CloseOpenWindow(true) });
	}

	MCPROT.GetCookie = function (name, defValue)
	{
		return getCookieGuaranteed(name, defValue);
	}

	MCPROT.SetCookie = function (name, value)
	{
		return SetCookie(name, value);
	}

	MCPROT.CloseOpenWindow = function (killAll)
	{
		if (this.winActive)
		{
			this.ToggleWin();
		}
		if (killAll)
		{
			this.win = null;
			this.fvm = null;
		}
	}

	MCPROT.GetMacIconLoc = function ()
	{
		var curleft = 0;
		var curtop = 0;
		var obj = this.macIcon;
		if (obj.offsetParent)
		{
			while (obj.offsetParent)
			{
				curleft += obj.offsetLeft
				curtop += obj.offsetTop;
				obj = obj.offsetParent;
			}
		}
		else if (obj.x)
		{
			curtop += obj.y;
			curleft += obj.x;
		}
		this.macIconLeft = curleft;
		this.macIconTop = curtop;
	}

	MCPROT.MacPlay = function ()
	{
		this.FVMGet();
		if (this.fvm.activeMacroCode)
			this.fvm.RunMacro(this.fvm.activeMacroName, this.fvm.activeMacroCode, this.fvm.activeMacroIsPub);
		else
			this.ShowWinPage();
	}

	MCPROT.DesignNew = function ()
	{
		var me = this;
		this.fvm.recPending = true;
		window.setTimeout(function () { me.ToggleWin(); me.ToggleWin(); }, 1);
	}

	MCPROT.MacRecStartStop = function ()
	{
		this.FVMGet();
		if (this.recording)
		{
			this.recording = false;
			this.fvm.FinishRecording();
			this.winActive = false;
			if (this.macIcon)
				this.macIcon.src = 'macroIco.gif';
			this.ToggleWin();
		}
		else
		{
			if (this.fvm.StartRecording())
			{
				if (this.macIcon)
					this.macIcon.src = 'macroRecording.gif';
				this.recording = true;
				SCSetFocus(termW.em);
				this.FlashMessage('Macro Recording Started...<br /><br />Press alt-R Hotkey again or click on Macro Icon to stop...', 1500);
			}
		}
	}

	MCPROT.FlashMessage = function (msg, milliseconds)
	{
		if (typeof (SCStatusScreen) != 'undefined')
		{
			SCStatusScreen(msg);
			window.setTimeout('HideStatus()', milliseconds);
		}
	}

	MCPROT.PopupForm = function (html)
	{
		return ShowInfoElem(html);
	}

	MCPROT.ToggleWin = function ()
	{
		var me = this;
		if (this.recording)
		{
			window.setTimeout(function () { me.MacRecStartStop() }, 1);
			return;
		}
		if (this.winActive)
		{
			this.HideWinPage();
		}
		else
		{
			this.FVMGet();
			this.ShowWinPage();
		}
	}

	MCPROT.SetSizingElems = function (widthElemID, heightElemID)
	{
		this.widthElemID = widthElemID;
		this.heightElemID = (heightElemID) ? heightElemID : widthElemID;
	}

	MCPROT.SizeWinPageTo = function (elem)
	{
		try
		{
			var widthElem = null,
				heightElem = null,
				vp = flow.macs.GetViewPort(),
				elemWidth, elemHeight, left,
				heightAdj = (is_ipad) ? 40 : 20;
			if (elem)
			{
				widthElem = elem;
				heightElem = elem;
			}
			else
			{
				widthElem = this.macDoc.getElementById(this.widthElemID);
				heightElem = this.macDoc.getElementById(this.heightElemID);
			}
			if (!heightElem)
				heightElem = widthElem;
			if (!widthElem)
				widthElem = heightElem;
			elemWidth = Math.min(vp.width - 20, widthElem.offsetWidth + 30);
			elemHeight = Math.min(vp.height - heightAdj, heightElem.offsetHeight + 10);
			if (elemWidth < widthElem.offsetWidth + 30)
				elemHeight += 20;
			this.win.height = '' + elemHeight + 'px';
			this.GetMacIconLoc();
			this.win.style.top = '' + (this.macIconTop - 5) + 'px';
			left = Math.min(this.macIconLeft - 5, (vp.width / 2 - elemWidth / 2));
			this.win.style.left = '' + left + 'px';
			this.win.width = '' + elemWidth + 'px';
			window.setTimeout("flow.macs.CheckScrollBug()", 1);
			//ResizeTermW();
		} catch (e) { }
	}

	MCPROT.HideWinPage = function ()
	{
		if (this.win)
		{
			this.win.style.visibility = 'hidden';
			this.win.style.zIndex = -1;
		}
		this.winActive = false;
	}

	MCPROT.ActivateWinPage = function ()
	{
		this.win.style.visibility = 'visible';
		this.win.style.zIndex = 500;
	}

	MCPROT.ShowWinPage = function (page)
	{
		if (!page)
			page = flow.macs.macUri + 'MacrosMgr.htm';
		if (!this.win)
		{
			this.win = document.createElement("iframe");
			this.win.name = this.win.id = "MacWin";
			this.win.className = "macWin";
			this.win.style.position = "absolute";
			this.div = document.createElement('div');
			document.body.appendChild(this.div);
			this.div.appendChild(this.win);
			var docElem = (document.compatMode === "CSS1Compat") ?
			 document.documentElement :
			 document.body;
			this.win.height = "300px";
			this.win.width = "800px";
			this.win.style.top = '10px';
			this.win.style.left = "20px";
		}
		this.win.style.visibility = 'hidden';
		this.win.style.zIndex = -1;

		if (this.win.src != page)
			this.win.src = page;
		else
		{
			var winwin = window.frames["MacWin"];
			if (winwin && winwin.Reload)
				winwin.Reload();
		}
		this.winActive = true;
	}
} ());
