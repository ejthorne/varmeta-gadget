// Module Pattern for best performance and non-global vars
/// <reference path="SCMacros.js" />
/// <reference path="DragMgr.js" />
(function ()
{
	var movedWins = {};
	flow.nextZIndex = 100;
	flow.macs.DynWin = function (htDoc, parent, asChild)
	{
		if (!htDoc)
			return;
		this.htDoc = htDoc;
		this.window = (htDoc.parentWindow) ? htDoc.parentWindow : htDoc.defaultView;
		this.height = 0;
		this.width = 0;
		this.leftMargin = 3;
		this.winTop = 150;
		this.asChild = (asChild) ? true : false;
		this.parent = (parent) ? parent : null;
		this.CancelEv = flow.macs.CancelEv;
	}
	var DWPROT = flow.macs.DynWin.prototype; //convenience

	DWPROT.GetNewZIndex = function (parent)
	{
		if (!parent.style)
			parent = parent.elem;
		if (!parent || !parent.style)
			return 100;
		if (parent.style.zIndex == 'auto')
		{
			flow.nextZIndex += 10;
			return flow.nextZIndex;
		}
		else
			return parent.style.zIndex + 10;
	}

	// Set Click will cancel mousedowns and call-back on mouseups, to 
	// prevent bubble-up to dragger events
	DWPROT.CaptureClick = function (elem, onMU)
	{
		var me = this;
		elem.style.cursor = 'pointer';
		elem.ontouchstart = elem.ontouchmove = elem.onmousemove = elem.onmousedown = elem.onclick = function (event) { var e = me.GetEvent(event); return me.CancelEv(e) };
		elem.ontouchend = elem.onmouseup = onMU;
	}

	DWPROT.GetEvent = function (e)
	{
		var e = e;
		if (!e) e = this.window.event;
		return e;
	}

	DWPROT.init = function (id, title, modal, zIndex, topOffset, leftOffset)
	{
		var me = this;
		this.parentElem = (this.asChild) ? this.parent : this.htDoc.body;
		this.id = id;
		this.modal = (modal) ? true : false;
		this.title = title;
		this.elemID = id + '_dv_Main';
		this.elem = this.getById(this.elemID);
		if (topOffset)
			this.topOffset = topOffset;
		if (leftOffset)
			this.leftOffset = leftOffset;
		if (!this.elem)
			this.elem = this.NewDiv('Main', 'dynWin', this.parentElem);
		else if (this.elem.parentNode.id != this.parentElem.id)
			this.parentElem.appendChild(this.elem);
		if (this.asChild)
		{
			this.elem.style.position = 'relative';
			try { this.elem.style.zIndex = 'auto'; } catch (e) { this.elem.style.zIndex = 0; }
			this.elem.style.left = '0px';
			this.elem.style.right = '0px';
			this.elem.style.border = 'solid 1px #ddddff';
		}
		else
		{
			if (zIndex)
				this.zIndex = zIndex;
			else
				this.zIndex = 1000;
			this.dragger = new flow.macs.DragMgr((this.htDoc.parentWindow) ? this.htDoc.parentWindow : this.htDoc.defaultView);
			this.dragger.initDrag(this.elem, this.id, this.UpdWinPos,
				function (id, elem, mouseX, mouseY)
				{
					return me.DragMM(id, elem, mouseX, mouseY);
				});
			if (movedWins[id])
				delete movedWins[id];
		}

		this.elem.innerHTML = ''; // clear it out if it is already drawn
		this.elem.style.visibility = 'hidden';
	}

	DWPROT.DragMM = function (id, elem, mouseX, mouseY)
	{
		var winLeft = parseInt(this.elem.style.left),
			 winTop = parseInt(this.elem.style.top),
			 intraX = mouseX - winLeft,
			 intraY = mouseY - winTop;
		if ((elem != this.elem) &&
			 (elem.className != 'title'))
			return 'none';
		if (intraY <= 20)
		{
			elem.style.cursor = 'move';
			if (elem.className == 'title')
			{
				return this.elem;
			}
		}
		else
			elem.style.cursor = 'default';
		return elem.style.cursor;
	}

	DWPROT.UpdWinPos = function (id, elem, leftX, topY, width, align)
	{
		if (align)
			movedWins[id] = true;
	}

	DWPROT.getDivById = function (id)
	{
		return this.getById(this.id + '_dv_' + id);
	}


	DWPROT.NewDiv = function (id, className, parent, html, width)
	{
		var id = this.id + '_dv_' + id,
			elem = this.getById(id);
		if (!elem)
		{
			elem = this.htDoc.createElement('div');
			elem.id = id;
			if (parent)
				parent.appendChild(elem);
		}
		if (className)
			elem.className = className;
		if (html)
			elem.innerHTML = html;
		if (width)
			elem.style.width = width;
		return elem;
	}

	DWPROT.NewDesignerForm = function (parent, width)
	{
		var elem = this.htDoc.createElement('form');
		if (!width)
			width = '35em';
		//<form class="pform" action="#" style="width:30em;min-width:30em;" method="post" id="dmform" name="dmform">
		elem.id = this.id + '_dmform';
		elem.className = 'pform';
		elem.action = '#';
		elem.method = 'post';
		elem.onSubmit = function () { return false };
		elem.style.width = width;
		elem.style.minWidth = width;
		this.designerForm = elem;
		if (parent)
			parent.appendChild(elem);
		return elem;
	}

	DWPROT.GetExtTypeObj = function (extTypeList, extType)
	{
		var extObj = extTypeList[extType];
		if (!this.allTypesOK &&
			 (this.hasChildren != extObj.hasChildren))
			return null;
		return extObj;
	}

	DWPROT.GenTypeSelection = function (np, extTypeList, selectionLabel, RBperLine)
	{
		var t = '', count = 0, extType, extObj, extTypeAdded = false, firstExtType = null,
				rbCount = 0, rbMax = (typeof (RBperLine) == 'number') ? RBperLine : 4;
		for (extType in extTypeList)
			count++;
		if (count < 2)
			return t;
		for (extType in extTypeList)
		{
			extObj = this.GetExtTypeObj(extTypeList, extType);
			if (!extObj)
				continue;
			if (!firstExtType)
				this.firstExtType = firstExtType = extType;
			if (typeof (extObj) == 'function')
				continue;
			if (!extTypeAdded)
			{
				t += '<div style="float:left"><label class="narrow">' + selectionLabel + ' Type: </label></div><div style="float:left">';
				extTypeAdded = true;
			}
			rbCount++;
			if (rbCount > rbMax)
			{
				t += '<br />';
				rbCount = 1;
			}
			t += '<input type="radio" value="' + extType + '" name="' + np + 'RBExtGroup' + '" title="' + extObj.title + '" id="' + np + 'RB' + extType + '" /> ' + extObj.text;
		}
		t += '</div>';
		return t;
	}

	DWPROT.SetTypeSelection = function (np, extTypeList)
	{
		var rbElem, extType, me = this;
		for (extType in extTypeList)
		{
			if (!this.GetExtTypeObj(extTypeList, extType))
				continue;
			rbElem = this.getById(np + 'RB' + extType);
			if (rbElem)
				rbElem.onclick = function () { me.ExtTypeClicked(this.value) };
		}
		rbElem = null; // clear for set logic...
		if (!this.extType)
			this.extType = this.firstExtType;
		rbElem = this.getById(np + 'RB' + this.extType);
		if (rbElem)
			rbElem.checked = true;
	}

	DWPROT.ExtTypeClicked = function (extType)
	{
		if (this.extType != extType)
		{
			this.extType = extType;
			this.GenDetailsElem(this.np, false, this.extTypeList[extType], this.DetailsWidth);
			this.Resize();
		}
	}

	// - TypeList is based on the xlsData types...caller should set
	// active typelist using this.extType prior to calling
	// also, store all dynamic properties in a object named this.extProps
	DWPROT.GenDetailsElem = function (np, initializing, extObj, formWidth, varRef)
	{
		var t = '',
			 value, formElem, me = this, id, pname, propObj, inpIds = [], i, elem;
		if (!formWidth)
			formWidth = '30em';
		this.DetailsWidth = formWidth;
		if (initializing && extObj.initFunc && varRef)
			extObj.initFunc(this, varRef);
		t += '<form class="pform" action="#" style="width:' + formWidth + ';min-width:' + formWidth + ';" method="post" id="' + np + 'form2" name="' + np + 'form2">';
		if (extObj.propNames)
		{
			t += this.GenPropControls(np, extObj.propNames, inpIds);
		}
		t += '</form>';
		if (this.detailsElem)
			this.detailsElem.innerHTML = t;
		else
			this.detailsElem = this.NewDiv(np + 'Det', 'userInput', this.elem, t);
		for (i = 0; i < inpIds.length; i++)
		{
			elem = this.getById(inpIds[i]);
			if (elem)
				elem.onblur = function () { me.SaveExtPropVal(me.np, this) }; // Could also validate...but forms-level seems friendlier for this
		}
		if (!initializing)
		{
			try { this.getById(inpIds[0]).focus(); } catch (e) { }
		}
		formElem = this.getById(np + 'form2');
		if (formElem)
			formElem.onkeydown = function (event) { me.CheckEnterKey(event) };
	}

	DWPROT.GenPropControls = function (np, propNames, inpIds)
	{
		var t = '';
		for (pname in propNames)
		{
			propObj = propNames[pname];
			if (typeof (propObj) == 'function')
				continue;
			if (pname == 'prop$Names')
			{
				t += '<ul>';
				t += this.GenPropControls(np, propObj, inpIds);
				t += '</ul>';
			}
			else
			{
				if (propObj.constFunc)
				{
					if (this[propObj.constFunc])
					{
						t += this[propObj.constFunc](np, pname, propObj, inpIds);
					}
					else
						alert('The Designer ' + this.title + ' Property named ' + pname + ' in a Dynamic Properties window, has a Constructor named ' + propObj.constFunc + ' but no control building function of that name exists');
				}
				else
				{
					t += '<label class="medium">' + propObj.text + ': </label>';
					id = np + 'Txt' + this.extType + '_' + pname;
					inpIds.push(id);
					value = this.GetExtPropVal(this.extType + '_' + pname, propObj.defaultValue);
					t += '<input type="text" title="' + propObj.title + '" name="' + id + '" value="' + value + '" id="' + id + '" style="width:12em" /><br />\n';
				}
			}
		}
		return t;
	}

	DWPROT.SetExtPropVal = function (name, val)
	{
		var propName = this.extObj[name], extName;
		if (propName)
		{
			extName = this.extType + '_' + propName;
			this.extProps[extName] = val;
		}
	}

	DWPROT.SetExtEntryVal = function (propName, val)
	{
		var extName = this.extType + '_' + propName;
		this.extProps[extName] = val;
	}

	DWPROT.GetExtPropVal = function (propName, defaultValue)
	{
		if (!defaultValue)
			defaultValue = '';
		return ((this.extProps[propName]) ? this.extProps[propName] : defaultValue);
	}

	DWPROT.SaveExtPropVal = function (np, textCtl)
	{
		var propName = textCtl.id.substr(3 + np.length);
		this.extProps[propName] = textCtl.value;
	}

	DWPROT.IsValid = function (np, name, obj)
	{
		var elem, value, ok = true;
		elem = this.GetTextElem(np, name);
		if (!elem)
			return false;
		value = elem.value;
		if (obj.editRegex)
		{
			if (!value.match(obj.editRegex))
				ok = false;
		}
		if (ok && obj.editFunc)
		{
			ok = obj.editFunc(value);
		}
		if (ok !== true)
		{
			if (typeof (ok) == 'string')
				alert(ok);
			else
				alert('The ' + obj.text + ' value of "' + value + '" is invalid: ' + obj.title);
			try { elem.focus(); } catch (e) { }
		}
		return ok;
	}

	// Validate First...
	DWPROT.ExtObjValidation = function (extObj)
	{
		if (extObj.propNames)
		{
			for (pname in extObj.propNames)
			{
				propObj = extObj.propNames[pname];
				if (pname == 'prop$Names')
					this.ExtObjValidation(propObj);
				else
				{
					if (typeof (propObj) == 'function')
						continue;
					if (!this.IsValid(this.np, this.extType + '_' + pname, propObj))
						return false;
				}
			}
		}
		return true;
	}

	DWPROT.GetExtPropsValues = function (extObj, extProps, objName)
	{
		var pname, propObj, propNames;
		if (!objName)
			objName = 'propNames';
		if (extObj[objName])
		{
			propNames = extObj[objName];
			for (pname in propNames)
			{
				propObj = propNames[pname];
				if (pname == 'prop$Names')
					this.GetExtPropsValues(propNames, extProps, 'prop$Names');
				else
				{
					if (typeof (propObj) == 'function')
						continue;
					extProps[pname] = this.GetTextElem(this.np, this.extType + '_' + pname).value;
				}
			}
		}
	}

	DWPROT.FixupValues = function (newActions)
	{
		var i, newAction, actionRef, id, prop;
		for (i = 0; i < newActions.length; i++)
		{
			newAction = newActions[i];
			for (id in newAction)
			{
				if (id.substring(0, 2) == 'e_')
				{
					newAction[id.substring(2)] = this.extProps[newAction[id]];
				}
				else if (id == 'newActions')
				{
					this.FixupValues(newAction[id]);
				}
			}
		}
	}

	DWPROT.GetTextElem = function (np, name)
	{
		var id = np + 'Txt' + name, elem;
		elem = this.getById(id);
		if (!elem)
			alert('Failure during validation (Element Not Found), ID="' + id + '"!');
		return elem;
	}

	DWPROT.NewButton = function (id, text, parent)
	{
		var btn = this.htDoc.createElement('a');
		btn.href = '#';
		btn.id = this.id + '_dvb_' + id;
		btn.className = 'button';
		parent.appendChild(btn);
		var span = this.htDoc.createElement('span');
		span.innerHTML = text;
		btn.appendChild(span);
		return btn;
	}

	DWPROT.NewImage = function (id, src, width, height, className, parent)
	{
		var img = this.htDoc.createElement('img');
		img.id = this.id + '_img_' + id;
		img.className = className;
		img.src = src;
		img.width = width;
		img.height = height;
		parent.appendChild(img);
		return img;
	}

	DWPROT.SetButtonEnabled = function (id, enabled, onclick)
	{
		id = this.id + '_dvb_' + id;
		var btn = this.getById(id),
			span;
		if (btn)
		{
			span = btn.firstChild;
			if (span &&
				 (span.nodeType != 1))
				span = null;
			if (enabled)
			{
				btn.style.backgroundImage = "url('button_right.png')";
				btn.style.cursor = "pointer";
				btn.onclick = onclick;
				if (span)
				{
					span.style.backgroundImage = "url('button_left.png')";
					span.style.cursor = "pointer";
				}
			}
			else
			{
				btn.style.backgroundImage = "url('button_right_na.png')";
				btn.style.cursor = "default";
				btn.onclick = null;
				if (span)
				{
					span.style.backgroundImage = "url('button_left_na.png')";
					span.style.cursor = "default";
				}
			}
		}
	}

	DWPROT.NewLabel = function (id, text, parent)
	{
		var span = this.htDoc.createElement('span');
		span.className = 'label';
		span.id = this.id + '_dvl_' + id;
		span.innerHTML = text;
		parent.appendChild(span);
		return span;
	}

	DWPROT.CheckEnterKey = function (e)
	{
		var action = flow.macs.CheckEnterKey(this.htDoc, e);
		if (!action)
			return true;
		if (action == 'ok')
		{
			if (this.OKClick)
				this.OKClick();
			else
				this.BtnAction('ok')
		}
		else
			this.BtnAction('cancel')
		return false;
	}

	DWPROT.BtnAction = function (action, retObj)
	{
		if (!this.asChild)
		{
			this.parentElem.removeChild(this.elem);
			if (this.modal)
				this.ClearModalBlanket();
		}
		if (!retObj)
			retObj = this;
		if (this.onClose)
			this.onClose(retObj, action);
	}

	DWPROT.SetModalBlanket = function (zIndex, message)
	{
		this.mname = this.id + '_ModB'
		var elem = this.getById(this.mname);
		if (!elem)
		{
			elem = this.htDoc.createElement('div');
			elem.id = this.mname;
			elem.className = 'modalBlanket';
			this.htDoc.body.appendChild(elem);
		}
		var docElem = (this.htDoc.compatMode === "CSS1Compat") ?
									 this.htDoc.documentElement :
										this.htDoc.body;
		elem.style.height = docElem.clientHeight + 'px';
		elem.style.width = docElem.clientWidth + 'px';
		elem.style.top = '0px';
		elem.style.left = '0px';
		elem.onclick = function () { alert(message) };
		elem.style.zIndex = zIndex;
		elem.style.visibility = 'visible';
	}

	DWPROT.ClearModalBlanket = function ()
	{
		var elem = this.getById(this.mname);
		if (elem)
			this.htDoc.body.removeChild(elem);
	}

	DWPROT.getById = function (id, prop)
	{
		var elem = this.htDoc.getElementById(id);
		if (!elem)
			return null;
		if (prop)
			if (elem[prop])
				return elem[prop];
			else
				return null;
		else
			return elem;
	}

	DWPROT.Center = function (control)
	{
		var left = Math.floor(this.width / 2 - control.offsetWidth / 2) + 1;
		control.style.left = left + 'px';
	}

	DWPROT.SetLocation = function (control, topMargin, bottomMargin, left)
	{
		this.width = Math.max(this.width, control.offsetWidth + ((left) ? left : this.leftMargin));
		if (topMargin)
			this.height += topMargin;
		control.style.top = this.height + 'px';
		if (left)
			control.style.left = left + 'px';
		else
			control.style.left = this.leftMargin + 'px';
		this.height += control.offsetHeight;
		if (bottomMargin)
			this.height += bottomMargin;
	}

	DWPROT.Show = function (onClose, width, height, left, top)
	{
		this.onClose = onClose;
		if (!width)
			width = this.width;
		if (!height)
			height = this.height;
		if (!this.asChild)
		{
			if (!left || !top)
			{
				var docElem = (this.htDoc.compatMode === "CSS1Compat") ?
										 this.htDoc.documentElement :
											this.htDoc.body;
				if (!top)
					top = this.winTop;
				if (!left)
					left = Math.floor(docElem.clientWidth / 2 - width / 2);
			}
			if (this.leftOffset)
				left += this.leftOffset;
			if (this.topOffset)
				top += this.topOffset;
			this.elem.style.zIndex = this.zIndex;
			if (!(movedWins[this.id]))
			{
				this.elem.style.left = left + 'px';
				this.elem.style.top = top + 'px';
			}
		}
		if (width)
		{
			this.elem.style.width = width + 'px';
			this.width = width;
		}
		else
			this.width = this.elem.offsetWidth;
		if (height)
		{
			this.elem.style.height = height + 'px';
			this.height = height;
		}
		else
			this.height = this.elem.offsetHeight;
		this.elem.style.visibility = 'visible';
		if (this.modal)
			this.SetModalBlanket(this.zIndex - 1, 'Please Complete Dialog "' + this.title + '" Before clicking elsewhere...');
	}
} ());
