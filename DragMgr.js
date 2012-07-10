// Module Pattern for best performance and non-global vars
/// <reference path="SCMacros.js" />
(function ()
{
	var dragZIndex = 5000;
	flow.macs.DragMgr = function (win)
	{
		if (win)
			this.win = win;
		else
			this.win = window;
		this.targ = null;
		this.updFuncs = {};
		this.mmFuncs = {};
		this.clickFuncs = {};
		this.mSX = -1;
		this.MMType = 'move';
		this.MMObj = null;
		this.topX = 3000; // needs to be set by environment
		this.topY = 4000;
		this.minX = 0;
		this.minY = 0;
		this.useUnderLayer = true;
		this.shadeRect = null;
		this.CancelEv = flow.macs.CancelEv;
	}
	var DMPROT = flow.macs.DragMgr.prototype; // convenience

	DMPROT.GetEvObj = function (e)
	{
		if (!e) e = this.win.event;
		this.e = e;
		return e;
	}

	DMPROT.getEvent = function (e, save, initTarg)
	{
		var e = this.GetEvObj(e);
		if (save)
		{
			if (initTarg)
				this.targ = initTarg;
			else
			{
				if (e.target)
					this.targ = e.target;
				else if (e.srcElement)
					this.targ = e.srcElement;
				if (!this.targ.id ||
					 (this.targ.nodeType == 3)) // safari bug or interior span
				{
					while (this.targ && !this.targ.id)
						this.targ = this.targ.parentNode;
				}
			}
		}
		if (e.pageX || e.pageY)
		{
			this.mx = e.pageX;
			this.my = e.pageY;
		}
		else if (e.clientX || e.clientY)
		{
			this.mx = e.clientX + document.body.scrollLeft
				+ document.documentElement.scrollLeft;
			this.my = e.clientY + document.body.scrollTop
				+ document.documentElement.scrollTop;
		}
		return e;
	}

	DMPROT.GetUnderLayer = function ()
	{
		var eDoc = this.targ.document || this.targ.ownerDocument,
			 ulElem = eDoc.getElementById('dmULayer');
		if (!eDoc.body)
			return null;
		if (!ulElem)
		{
			ulElem = eDoc.createElement('div');
			ulElem.id = 'dmULayer';
			ulElem.className = 'DMULayer';
			eDoc.body.appendChild(ulElem);
		}
		return ulElem;
	}

	DMPROT.GetShadeLayer = function ()
	{
		if (!this.shadeRect)
			return null;
		var eDoc = this.targ.document || this.targ.ownerDocument,
			 ulElem = eDoc.getElementById('dmUShade');
		if (!eDoc.body)
			return null;
		if (!ulElem)
		{
			ulElem = eDoc.createElement('div');
			ulElem.id = 'dmUShade';
			ulElem.className = 'DMUShade';
			eDoc.body.appendChild(ulElem);
		}
		return ulElem;
	}

	// Call after getEvent...
	DMPROT.SetUnderLayer = function (id)
	{
		if (!this.useUnderLayer)
			return;
		var elemZ = (this.targ.style.zIndex) ? parseInt(this.targ.style.zIndex) : 10,
			 elem = this.GetUnderLayer(),
			 sElem = this.GetShadeLayer(),
			 me = this;
		elem.style.visibility = 'visible';
		elem.style.zIndex = elemZ - 1;
		elem.style.top = this.minY + 'px';
		elem.style.left = this.minX + 'px';
		elem.style.height = (this.topY - this.minY) + 'px';
		elem.style.width = (this.topX - this.minX) + 'px';
		elem.onmousemove = function (e) { me.MM(new String(id), e, true); };
		if (sElem)
		{
			sElem.style.visibility = 'visible';
			sElem.style.zIndex = elemZ - 1;
			sElem.style.top = this.shadeRect.minY + 'px';
			sElem.style.left = this.shadeRect.minX + 'px';
			sElem.style.height = (this.shadeRect.topY - this.shadeRect.minY) + 'px';
			sElem.style.width = (this.shadeRect.topX - this.shadeRect.minX) + 'px';
			sElem.onmousemove = function (e) { me.MM(new String(id), e, true); };
		}
	}

	DMPROT.FreeUnderLayer = function ()
	{
		if (!this.useUnderLayer)
			return;
		var elem = this.GetUnderLayer(),
			 sElem = this.GetShadeLayer();
		if (!elem)
			return;
		elem.style.visibility = 'hidden';
		elem.style.width = elem.style.height = 0;
		elem.style.zIndex = -1;
		elem.onmousemove = null;
		if (sElem)
		{
			sElem.style.visibility = 'hidden';
			sElem.style.width = elem.style.height = 0;
			sElem.style.zIndex = -1;
			sElem.onmousemove = null;
			this.shadeRect = null;   // only used for one drag...
		}
	}

	DMPROT.RegisterClick = function (id, clickFunc)
	{
		this.clickFuncs[id] = clickFunc;
	}

	DMPROT.initDrag = function (elem, id, updFunc, mmFunc, mdEv, shadeRect)
	{
		var me = this;
		this.MDisMU = false;
		if (shadeRect)
			this.shadeRect = shadeRect;
		this.updFuncs[id] = updFunc;
		this.mmFuncs[id] = mmFunc;
		elem.onmousedown = function (e) { me.MD(new String(id), e); };
		elem.onmouseup = function (e) { me.MU(new String(id), e); };
		elem.onmousemove = function (e) { me.MM(new String(id), e); };
		if (mdEv)
		{
			this.MD(id, mdEv, elem);
			this.MDisMU = true;
		}
	}

	DMPROT.MD = function (id, e, initTarg)
	{
		if (this.MDisMU)
		{
			this.MDisMU = false;
			return this.MU(id, e);
		}
		if (this.MMType == 'none')
			return true;
		this.IsSizer = (id == 'wizSizer');
		if (this.IsSizer)
		{
			var docElem = (document.compatMode === "CSS1Compat") ?
							    document.documentElement :
									document.body;
			this.docHeight = docElem.clientHeight;
		}
		var ev = this.getEvent(e, true, initTarg);
		if (this.targ != this.MMObj)
		{
			if (this.targ.className == 'title')
				this.targ = this.MMObj;
			else
				this.MMType = 'move';
		}
		this.SetUnderLayer(id);
		this.mSX = parseInt(this.mx);
		this.mSY = parseInt(this.my);
		this.wSY = parseInt(this.targ.style.top);
		this.wSX = parseInt(this.targ.style.left);
		this.targZIndex = this.targ.style.zIndex;
		this.targ.style.zIndex = dragZIndex;
		if (this.dragOpacity)
		{
			if (typeof (this.targ.style.opacity) != 'undefined')
				this.targ.style.opacity = this.dragOpacity;
			else
				this.targ.style.filter = 'alpha(opacity=' + this.dragOpacity * 100 + ')';
		}
		this.wSW = this.targ.offsetWidth;
		if (typeof (this.targ.setCapture) != 'undefined')
			this.targ.setCapture();
		if (this.IsSizer)
			this.updFuncs[id](id, this.targ, parseInt(this.targ.style.top), this.docHeight, true);
		return this.CancelEv(this.e);
	}

	DMPROT.CalcNewPos = function ()
	{
		this.newMSX = Math.floor(this.mx);
		this.newMSY = Math.floor(this.my);
		var topX = (this.shadeRect) ? Math.max(this.topX, this.shadeRect.topX) : this.topX,
			 topY = (this.shadeRect) ? Math.max(this.topY, this.shadeRect.topX) : this.topY,
			 minX = (this.shadeRect) ? Math.min(this.minX, this.shadeRect.minX) : this.minX,
			 minY = (this.shadeRect) ? Math.min(this.minY, this.shadeRect.minY) : this.minY,
			 maxLeft = (this.MMType == 'move') ? topX - this.targ.offsetWidth : 2000,
			 minLeft = (this.MMType == 'move') ? minX : -200;
		this.newLeft = Math.min(maxLeft, Math.max(minLeft, Math.floor(this.wSX + this.newMSX - this.mSX)));
		if (this.IsSizer)
		{
			this.newTop = Math.min(this.docHeight - this.targ.offsetHeight, Math.max(0, Math.floor(this.wSY + this.newMSY - this.mSY)));
		}
		else
			this.newTop = Math.min(topY - this.targ.offsetHeight, Math.max(minY, Math.floor(this.wSY + this.newMSY - this.mSY)));
	}

	DMPROT.MM = function (id, e, fromUnder)
	{
		var ev = this.getEvent(e), targ, eLeft, eTop;
		if (this.mSX == -1) // no active drag
		{
			targ;
			if (ev.target)
				targ = ev.target;
			else if (ev.srcElement)
				targ = ev.srcElement;
			if (targ.nodeType == 3) // defeat Safari bug
				targ = targ.parentNode;
			this.MMType = this.mmFuncs[id](id, targ, this.mx, this.my);
			if (typeof(this.MMType) == 'object')
			{
				this.MMObj = this.MMType;
				this.MMType = 'move';
			}
			else if (this.MMType == 'none')
			{
				this.MMObj = null;
				return true;
			}
			else
				this.MMObj = targ;
			return this.CancelEv(this.e);
		}
		if (fromUnder)
			fromUnder = true; //for breakpoint--remove!
		this.CalcNewPos();
		if (isNaN(this.newLeft))
			return this.CancelEv(this.e);
		switch (this.MMType)
		{
			case 'move':
				eLeft = parseInt(this.targ.style.left);
				eTop = parseInt(this.targ.style.top);
				// Check if it isn't really a move...
				if ((this.newLeft == eLeft) &&
					 (this.newTop == eTop))
					return this.CancelEv(this.e);
				this.targ.style.left = this.newLeft + "px";
				this.targ.style.top = this.newTop + "px";
				break;
			case 'e-resize':
				this.targ.style.width = Math.max(8, this.wSW + this.newLeft - this.wSX) + "px";
				break;
			case 'w-resize':
				this.targ.style.left = this.newLeft + "px";
				this.targ.style.width = Math.max(8, this.wSW + this.wSX - this.newLeft) + "px";
				break;
			case 'n-move':
				this.targ.style.top = this.newTop + "px";
				this.updFuncs[id](id, this.targ, parseInt(this.targ.style.top), this.docHeight, true);
				if (this.IsSizer)
					return this.CancelEv(this.e);
				break;
		}
		this.updFuncs[id](id, this.targ, parseInt(this.targ.style.left), parseInt(this.targ.style.top), this.targ.offsetWidth);
		return this.CancelEv(this.e);
	}

	DMPROT.MU = function (id, e)
	{
		var ev = this.getEvent(e);
		if (!this.targ)
		{
			if (this.clickFuncs[id])
				return this.clickFuncs[id](id, ev);
			else
				return true;
		}
		this.FreeUnderLayer();
		if (typeof (this.targ.releaseCapture) != 'undefined')
			this.targ.releaseCapture();
		this.targ.style.zIndex = this.targZIndex;
		if (this.dragOpacity)
		{
			if (typeof (this.targ.style.opacity) != 'undefined')
				this.targ.style.opacity = 100;
			else
				this.targ.style.filter = 'alpha(opacity=100)';
		}
		this.mSX = -1;
		this.MMType = 'move';
		if (this.IsSizer)
			this.updFuncs[id](id, this.targ, parseInt(this.targ.style.top), this.docHeight);
		else
			this.updFuncs[id](id, this.targ, parseInt(this.targ.style.left), parseInt(this.targ.style.top), this.targ.offsetWidth, true);
		return this.CancelEv(this.e);
	}
} ());

