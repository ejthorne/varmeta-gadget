// Module Pattern for best performance and non-global vars
/// <reference path="SCMacros.js" />
/// <reference path="DynWin.js" />
/// <reference path="DragMgr.js" />
/// <reference path="Plugin.js" />
(function ()
{
	//------------------------- Field Matcher ----------------------------------
	flow.macs.FieldMatcher = function (htDoc, parent, id, extIsTarget, extPropName, title, onClose)
	{
		flow.macs.DynWin.call(this, htDoc, parent);
		this.onClose = onClose;
		this.varRefs = new Array();
		this.extRefs = new Array();
		if (extIsTarget)
		{
			this.sources = this.varRefs;
			this.targets = this.extRefs;
		}
		else
		{
			this.sources = this.extRefs;
			this.targets = this.varRefs;
		}
		this.onNewVarRef = null;
		this.poolTitle = null;
		this.extPropName = extPropName;
		this.onNewExtRef = null;
		this.holdNewExt = false;
		this.holdNewVar = false;
		this.targTitle = null;
		this.init(id, (title) ? title : "External Fields Matcher", false, this.GetNewZIndex(parent));
		this.extIsTarget = extIsTarget;
		this.rowHeight = '1em';
		this.dragger = new flow.macs.DragMgr((htDoc.parentWindow) ? htDoc.parentWindow : htDoc.defaultView);
		this.childSource = null;
		this.poolVertGap = 4;
		this.poolMargins = 4;
		this.matchVertGap = 4;
		this.targWidth = 40;
		this.addingSrc = null;
		this.addingSrcCount = 0;

		this.addingTarg = null;
		this.addingTargCount = 0;
		this.linksFound = false;
	}
	flow.macs.FieldMatcher.prototype = new flow.macs.DynWin();
	var FMPROT = flow.macs.FieldMatcher.prototype; //convenience
	FMPROT.constructor = flow.macs.FieldMatcher;

	// Open a Child matcher window...
	FMPROT.OpenMatchChild = function (targ)
	{
		var me = this, fmObj, fmId = this.id + '_C',
			 macVar, vars, src = targ.linkedTo, ext, i, leftOffset = (this.leftOffset) ? this.leftOffset + 50 : 50,
			 topOffset = this.topOffset + 50;
		fmObj = this.fmObj = new flow.macs.FieldMatcher(this.htDoc, this.elem, fmId, this.extIsTarget, this.extPropName,
					targ.name + ' Variable Matching', function (obj, action) { me.ChildMatchAction(obj, action, targ) });
		if (this.leftOffset)
			fmObj.leftOffset = this.leftOffset
		fmObj.poolTitle = this.poolTitle;
		fmObj.targTitle = this.targTitle;
		if (this.SetVarStyle)
			fmObj.SetVarStyle = this.SetVarStyle;
		if (this.SetExtStyle)
			fmObj.SetExtStyle = this.SetExtStyle;
		if (this.onNewVarRef)
			fmObj.onNewVarRef = this.onNewVarRef;
		fmObj.holdNewVar = this.holdNewVar;
		ext = (this.extIsTarget) ? targ : src;
		if (this.onNewExtRef)
			fmObj.onNewExtRef = this.onNewExtRef;
		fmObj.holdNewExt = (ext.ext$Props.holdNewExt);
		fmObj.varSourceList = flow.macs.GetVarSourceListCopy(src.source + ',constant');
		fmObj.childSource = src.source;
		if (this.extIsTarget)
		{
			fmObj.AddVarRefs(src.children);
			if (src.newChildren)
				fmObj.AddVarRefs(src.newChildren);
			fmObj.AddExtRefs(targ.children);
		}
		else
		{
			fmObj.AddVarRefs(targ.children);
			if (targ.newChildren)
				fmObj.AddVarRefs(targ.newChildren);
			fmObj.AddExtRefs(src.children);
		}
		this.fmObj.Draw();
	}

	FMPROT.ChildMatchAction = function (matchObj, action, matchTarg)
	{
		if (action == 'ok')
		{
			var saveTo = (this.extIsTarget) ? matchTarg.linkedTo : matchTarg;
			if (!saveTo.newChildren)
				saveTo.newChildren = [];
			flow.macs.MatchVars(matchObj.varRefs, saveTo.newChildren, this.extIsTarget, this.extPropName, true);
			matchTarg.UpdateConnection();
		}
	}

	FMPROT.LinkVar = function (varRef)
	{
		var extPropName, newExtProp, prop;
		if (varRef.linkedTo && varRef.bindObj)
		{
			extPropName = varRef.linkedTo.ext$Props;
			if (!extPropName)
				extPropName = varRef.linkedTo.name;
			varRef.bindObj.linked = true;
			if (varRef.copyExp)
			{
				newExtProp = { 'copyExp': varRef.copyExp };
				if (typeof (extPropName) != 'object')
					newExtProp.name = extPropName;
				else
				{
					for (prop in extPropName)
					{
						if (typeof (prop) != 'function')
							newExtProp[prop] = extPropName[prop];
					}
				}
			}
			else
				varRef.bindObj[this.extPropName] = extPropName;
			varRef.linkedTo = null;
		}
	}

	FMPROT.SetCopyExp = function (obj, exp)
	{
		var newExpObj;
		newExpObj = JSON.parse('{copyExp:function(value){' + exp + '};}');
		obj.copyExp = newExpObj.copyExp;
	}

	FMPROT.GetCopyExp = function (obj)
	{
		var expString, braceAt, emptyFunc = 'return value;';
		if (!obj.copyExp)
			return emptyFunc;
		expString = String(obj.copyExp);
		braceAt = expString.indexOf('{');
		if (braceAt == -1)
			return emptyFunc;
		braceAt++;
		return expString.substring(braceAt, (expString.length - 1 - braceAt));
	}

	FMPROT.LinkMatches = function ()
	{
		var i;
		for (i = 0; i < this.varRefs.length; i++)
		{
			this.LinkVar(this.varRefs[i]);
		}
	}

	FMPROT.AddExtRefs = function (exts)
	{
		var i, ext;
		for (i = 0; i < exts.length; i++)
		{
			ext = exts[i];
			this.AddExtRef(ext);
		}
	}

	FMPROT.AddExtRef = function (ext)
	{
		return this.AddExtRef2(this.extRefs, ext);
	}

	FMPROT.AddExtRef2 = function (addArr, ext)
	{
		if (ext.children)
			ext.hasChildren = true;
		addArr.push(ext);
		return ext;
	}

	FMPROT.AddVarRefs = function (macVars)
	{
		var i, macVar;
		for (i = 0; i < macVars.length; i++)
		{
			macVar = macVars[i];
			this.AddVarRef(macVar.name, (macVar.bindObj) ? macVar.bindObj : macVar, macVar.type, macVar.label, macVar.source, macVar.val);
		}
	}

	FMPROT.AddVarRef = function (name, bindObj, type, label, source, value)
	{
		return this.AddVarRef2(this.varRefs, name, bindObj, type, label, source, value);
	}

	FMPROT.AddVarRef2 = function (addArr, name, bindObj, type, label, source, value)
	{
		var varRef = { 'name': name, 'linkedTo': null, 'index': addArr.length, 'type': type,
			'label': label, 'source': source, 'val': value
		},
			i, child;
		if (bindObj)
		{
			varRef.bindObj = bindObj;
			varRef.title = bindObj.title;
			if (bindObj.children)
			{
				varRef.hasChildren = true;
				varRef.children = [];
				varRef.newChildren = [];
				for (i = 0; i < bindObj.children.length; i++)
				{
					child = bindObj.children[i];
					this.AddVarRef2(varRef.children, child.name, child, child.type, child.label, child.source, child.val);
				}
			}
		}
		addArr.push(varRef);
		return varRef;
	}

	FMPROT.SrcDragPos = function (id, elem, leftX, topY, width, align)
	{
		var index = parseInt(id.substr(3)),
			src = this.sources[index],
			targField = null,
			me = this;
		if (align)
		{
			this.TargetMatched(src, elem);
			window.setTimeout(function () { me.draggedSrc = null }, 500);
			return;
		}
		this.draggedSrc = src;
		if (src.linkedTo)
		{
			src.linkedTo.linkedTo = null;
			src.linkedTo.rowDiv.className = 'loose';
			src.linkedTo = null;
		}
		if (leftX + width > this.matchLeft)
			targField = this.TargFieldOver(leftX, topY, width, elem.offsetHeight);

		if (!targField)
			this.RemoveMatch();
	}

	FMPROT.TargFieldOver = function (leftX, topY, width, height)
	{
		var i, targField, elem, myTop, overlap, percent;
		for (i = 0; i < this.targets.length; i++)
		{
			targField = this.targets[i];
			if (targField.linkedTo)
				continue;
			elem = targField.rowDiv;
			myTop = parseInt(elem.style.top);
			if ((topY + height > myTop) &&
				 (topY < myTop + elem.offsetHeight))
			{
				overlap = (topY < myTop) ? topY + height - myTop : myTop + elem.offsetHeight - topY;
				percent = overlap / height;
				if (percent > 0.5)
				{
					this.RemoveMatch();
					this.activeMatch = targField;
					if (this.CompatibleDrop(this.draggedSrc, targField))
					{
						elem.className = 'target';
					}
					else
					{
						elem.className = 'misMatch';
					}
					return this.activeMatch;
				}
			}
		}
		return null;
	}

	FMPROT.CompatibleDrop = function (src, targ)
	{
		if (targ.type &&
			 (targ.type == '*add'))
			return true;
		if (src.type &&
			 (src.type == '*add'))
			return true;
		return ((!src.hasChildren && !targ.hasChildren) ||
			     (src.hasChildren && targ.hasChildren));
	}

	FMPROT.RemoveMatch = function ()
	{
		if (this.activeMatch)
		{
			this.activeMatch.rowDiv.className = 'loose';
			if (this.activeMatch.UpdateConnection)
				this.activeMatch.UpdateConnection();
			this.activeMatch = null;
		}
	}

	FMPROT.CancelNewDrop = function (src)
	{
		this.activeMatch.rowDiv.className = 'loose';
		this.PositionPoolElem(src.elem)
		this.activeMatch = null;
	}

	FMPROT.TargetMatched = function (src, elem)
	{
		var me = this, varRef, extRef;
		if (this.activeMatch)
		{
			// Check for adding
			varRef = (this.extIsTarget) ? src : this.activeMatch;
			extRef = (this.extIsTarget) ? this.activeMatch : src;

			if ((extRef.type == '*add') ||
				 (varRef.type == '*add'))
			{
				completed = true;
				if (extRef.type == '*add')
				{
					if (this.onNewExtRef && !this.holdNewExt)
					{
						this.onNewExtRef(extRef, varRef, function (newExt, msg) { me.NewExtOnClose(newExt, msg, extRef, src) }, null);
					}
					else
					{
						alert('Plug-In has not defined the onNewExtRef event for the FieldMatcher object--cannot add a external plugin data reference!');
						this.CancelNewDrop(src);
					}
				}
				else
					this.HandleNewVarDrop(src);
			}
			else
				this.CompleteMatch(src);
		}
	}

	FMPROT.HandleNewVarDrop = function (src)
	{
		var me = this;
		if (this.onNewVarRef)
		{
			if (this.extIsTarget)
				this.onNewVarRef(src, this.activeMatch, function (newVar, msg) { me.NewVarOnClose(newVar, msg, src, src) }, null, this.varSourceList, this.childSource);
			else
				this.onNewVarRef(this.activeMatch, src, function (newVar, msg) { me.NewVarOnClose(newVar, msg, me.activeMatch, src) }, null);
		}
		else
		{
			alert('Plug-In has not defined the onNewVarRef event for the FieldMatcher object--cannot add a new Macro Variable Reference!');
			this.CancelNewDrop(src);
		}
	}

	FMPROT.SetupExtUpdate = function (src)
	{
		var me = this;
		if (!this.onNewExtRef)
			return;
		if (!src.ext$Props || !src.ext$Props.dynamicDef)
			return;
		if (!this.extIsTarget && !src.linkedTo)
			return;
		src.elem.style.cursor = 'pointer';
		src.elem.title = 'Click to Update External Data Definition...';
		src.elem.onclick = function ()
		{
			me.CheckExtClick(this);
		};
	}

	FMPROT.CheckExtClick = function (elem)
	{
		var i, extRef, me = this;
		for (i = 0; i < this.extRefs.length; i++)
		{
			extRef = this.extRefs[i];
			if (extRef.elem == elem)
				break;
			extRef = null;
		}
		if (!extRef)
			return;
		if (extRef == this.draggedSrc)
		{
			this.draggedSrc = null;
			return;
		}
		if (this.onNewExtRef)
		{
			this.onNewExtRef(extRef, extRef.linkedTo, function (newExt, msg) { me.UpdateExtOnClose(newExt, msg, extRef) }, extRef);
		}
	}

	FMPROT.SetupVarUpdate = function (existingVar)
	{
		var me = this;
		if (!this.onNewVarRef)
			return;
		existingVar.elem.style.cursor = 'pointer';
		existingVar.elem.title = 'Click to Update Macro Variable Definition properties...';
		existingVar.elem.onclick = function ()
		{
			me.CheckVarClick(this);
		};
	}

	FMPROT.CheckVarClick = function (elem)
	{
		var v, varRef, me = this;
		for (v = 0; v < this.varRefs.length; v++)
		{
			varRef = this.varRefs[v];
			if (varRef.elem == elem)
				break;
			varRef = null;
		}
		if (!varRef)
			return;
		if (varRef == this.draggedSrc)
		{
			this.draggedSrc = null;
			return;
		}
		if (this.onNewVarRef)
		{
			this.onNewVarRef(varRef, varRef.linkedTo, function (newVar, msg) { me.UpdateVarOnClose(newVar, msg, varRef) }, varRef, this.varSourceList, this.childSource);
		}
	}

	FMPROT.UpdateExtOnClose = function (newExt, msg, existingExt)
	{
		if (msg == 'ok')
		{
			var oldWidth = existingExt.elem.offsetWidth, extProp;
			existingExt.name = existingExt.ext$Props.name = newExt.name;
			if (!newExt.ext$Props.immutable)
				existingExt.ext$Props = newExt.ext$Props;

			existingExt.elem.style.width = null;
			existingExt.elem.innerHTML = this.GetElemHtml(existingExt, this.extIsTarget)
			if (existingExt.elem.offsetWidth > oldWidth)
				this.Resize();
			else
				existingExt.elem.style.width = ((this.extIsTarget) ? this.targWidth : this.srcWidth) + 'px';
		}
	}

	FMPROT.UpdateVarOnClose = function (newVar, msg, existingVar)
	{
		if (msg == 'ok')
		{
			var oldWidth = existingVar.elem.offsetWidth;
			existingVar.name = newVar.name;
			existingVar.val = newVar.val;
			existingVar.source = newVar.source;
			existingVar.label = newVar.label;
			existingVar.title = newVar.title;
			existingVar.elem.style.width = null;
			existingVar.elem.innerHTML = this.GetElemHtml(existingVar, !this.extIsTarget)
			if (existingVar.elem.offsetWidth > oldWidth)
				this.Resize();
			else
				existingVar.elem.style.width = ((this.extIsTarget) ? this.srcWidth : this.targWidth) + 'px';
		}
	}

	FMPROT.NewVarOnClose = function (newVar, msg, varRef, src, doubleAdd)
	{
		if (msg == 'ok')
		{
			var c, oldWidth;
			if (newVar.type)
				varRef.type = newVar.type;
			else
				varRef.type = 'match';
			varRef.name = newVar.name;
			varRef.val = newVar.val;
			varRef.source = newVar.source;
			if (newVar.source == 'user')
			{
				varRef.label = newVar.label;
				varRef.title = newVar.title;
			}
			if (newVar.children)
			{
				varRef.hasChildren = true;
				varRef.children = [];
				for (c = 0; c < newVar.children.length; c++)
				{
					varRef.children.push(newVar.children[c]);
				}
			}
			oldWidth = varRef.elem.offsetWidth;
			varRef.elem.style.width = 'auto';
			varRef.elem.innerHTML = this.GetElemHtml(varRef, !this.extIsTarget);

			if (this.extIsTarget)
			{
				// added as a source...
				this.CompleteMatch(varRef);
				this.CreateAddSrc(true);
				this.SetupVarUpdate(varRef);
				if (doubleAdd)
					this.CreateAddTarget(true);
			}
			else
			{
				this.CompleteMatch(src);
				this.CreateAddTarget(true);
				if (doubleAdd)
					this.CreateAddSrc(true);
			}

			if (varRef.elem.offsetWidth > oldWidth)
				this.Resize();
			else
				varRef.elem.style.width = ((this.extIsTarget) ? this.srcWidth : this.targWidth) + 'px';
		}
		else
		{
			this.CancelNewDrop(varRef);
			return;
		}
	}

	FMPROT.NewExtOnClose = function (newExt, msg, extRef, src)
	{
		var oldWidth, dropVar = null, addVarToo = false, i, child;
		if (msg == 'ok')
		{
			if (newExt.type)
				extRef.type = newExt.type;
			else
				extRef.type = 'match';

			extRef.name = newExt.name;
			extRef.val = newExt.val;
			extRef.ext$Props = newExt.ext$Props;
			if (newExt.hasChildren)
			{
				extRef.hasChildren = true;
				extRef.children = [];
				for (i = 0; i < newExt.children.length; i++)
				{
					child = newExt.children[i];
					this.AddExtRef2(extRef.children, child);
				}
			}
			oldWidth = extRef.elem.offsetWidth;
			extRef.elem.style.width = 'auto';
			extRef.elem.innerHTML = this.GetElemHtml(extRef, this.extIsTarget);
			if (!this.extIsTarget)
			{
				// added as a source...
				dropVar = this.activeMatch;
				if (dropVar.type &&
					 (dropVar.type == '*add'))
					addVarToo = true;
				else
				{
					this.CompleteMatch(extRef);
					this.SetupExtUpdate(extRef);
					this.CreateAddSrc(true);
				}
			}
			else
			{
				dropVar = src;
				if (dropVar.type &&
					 (dropVar.type == '*add'))
					addVarToo = true;
				else
				{
					this.CompleteMatch(src);
					this.SetupExtUpdate(extRef);
					this.CreateAddTarget(true);
				}
			}

			if (extRef.elem.offsetWidth > oldWidth)
				this.Resize();
			else
				extRef.elem.style.width = ((this.extIsTarget) ? this.targWidth : this.srcWidth) + 'px';
			if (addVarToo)
				this.HandleNewVarDrop(src);
		}
		else
		{
			this.CancelNewDrop(src);
			return;
		}
	}

	FMPROT.CompleteMatch = function (src)
	{
		if (!this.activeMatch)
			return; //already done...
		var elem = src.elem, message;
		if (!this.CompatibleDrop(src, this.activeMatch))
		{
			if (src.hasChildren)
				message = 'You cannot match a Array of values with a single target!';
			else
				message = 'You cannot match a single value with an Array target!';
			alert(message);
			this.RemoveMatch();
			return;
		}
		this.activeMatch.rowDiv.className = 'linked';
		this.activeMatch.linkedTo = src;
		if (this.activeMatch.UpdateConnection)
			this.activeMatch.UpdateConnection();
		src.linkedTo = this.activeMatch;
		elem.style.top = (parseInt(src.linkedTo.rowDiv.style.top) + 3) + 'px';
		elem.style.left = (parseInt(src.linkedTo.rowDiv.style.left) + 3) + 'px';
		this.activeMatch = null;
	}

	FMPROT.CreateAddSrc = function (dynamic)
	{
		var srcIndex = this.sources.length;
		this.addingSrcCount++;
		if (this.extIsTarget)
			this.addingSrc = this.AddVarRef("New" + this.addingSrcCount, null, '*add', 'Create a New Macro Variable Definition', false, null);
		else
		{
			this.addingSrc = this.AddExtRef({ "name": "New" + this.addingSrcCount, "type": "*add" });
		}
		if (dynamic)
		{
			var elem = this.CreateAddSrcElem(this.addingSrc);
			this.PositionPoolElem(elem, true);
			this.SetDrag(this.addingSrc, 'New' + srcIndex);
		}
		return this.addingSrc;
	}

	FMPROT.PositionPoolElem = function (elem, asAdd)
	{
		var top = 0,
			 lastHeight = 0,
			 lastElem = null,
			 addSrc = null,
			 i, src, elemTop, newTop, me = this;
		for (i = 0; i < this.sources.length; i++)
		{
			src = this.sources[i];
			if (!asAdd &&
				 (src.type == '*add'))
				addSrc = src;
			if (!src.linkedTo &&
				 (src.type != '*add'))
			{
				elemTop = parseInt(src.elem.style.top);
				top = Math.max(elemTop, top);
				if (top == elemTop)
					lastElem = src.elem;
			}
		}

		newTop = (lastElem == null) ?
				this.controlsTop + this.poolVertGap :
				top + lastElem.offsetHeight + this.poolVertGap;

		if (lastElem &&
		    (addSrc != null) &&
			 (parseInt(addSrc.elem.style.top) <= newTop))
		{
			addSrc.elem.style.top = (newTop + lastElem.offsetHeight + this.poolVertGap) + 'px';
		}

		elem.style.top = newTop + 'px';
		elem.style.left = this.srcLeft + 'px';
		elem.style.width = this.srcWidth + 'px';
		if (asAdd &&
			 (newTop + elem.offsetHeight + 8 > this.controlsBottom))
			window.setTimeout(function () { me.Resize(); }, 1);
	}

	FMPROT.CreateAddSrcElem = function (src)
	{
		var className = (this.extIsTarget) ? 'src macVar' : 'src ext';
		src.elem = this.NewDiv('src_' + src.name, className, this.elem,
						'<img src="img/add.gif" class="addimg"/>Create New');
		if (this.extIsTarget)
		{
			src.elem.title = 'Drag and Drop to create a new Value Field';
			if (this.SetVarStyle)
				this.SetVarStyle(src);
		}
		else
		{
			src.elem.title = 'Drag and Drop to create a new Plugin Data Source Definition';
			if (this.SetExtStyle)
				this.SetExtStyle(src);
		}
		return src.elem;
	}

	FMPROT.CreateAddTarget = function (dynamic)
	{
		var targIndex = this.targets.length;
		this.addingTargCount++;
		if (this.extIsTarget)
		{
			this.addingTarg = this.AddExtRef({ "name": "New" + this.addingTargCount, "type": "*add" });
		}
		else
			this.addingTarg = this.AddVarRef("New" + this.addingTargCount, null, '*add', 'Create a New Macro Variable Definition', false, null);
		if (dynamic)
		{
			var elem = this.CreateTargElem(this.addingTarg, true);
			if (this.PositionNewTarg(elem))
				this.Resize();
		}
	}

	FMPROT.CreateTargElem = function (targ, asAdd)
	{
		var me = this, t, src,
			 className = (this.extIsTarget) ? 'targ ext' : 'targ macVar',
			 targetDesc = (this.extIsTarget) ? 'Plugin Data Definition' : 'Macro Variable';
		targ.rowDiv = this.NewDiv('row_' + targ.name, 'loose', this.elem);
		if (asAdd)
		{
			targ.elem = this.NewDiv('targ_' + targ.name, className, targ.rowDiv,
						'<img src="img/add.gif" class="addimg"/>Create New');
			targ.rowDiv.title = 'Drop here to create a new Target ' + targetDesc;
		}
		else
		{
			targ.elem = this.NewDiv('targ_' + targ.name, className, targ.rowDiv, this.GetElemHtml(targ, true));
			targ.rowDiv.title = 'Drop here to Match with the ' + targ.name + ' ' + targetDesc;
		}
		targ.connector = this.NewImage('conn_' + targ.name, 'img/Copy.png', 18, 18, 'connector', targ.rowDiv);
		targ.connector.style.visibility = 'hidden';
		this.AddTargetFuncs(targ);
		if (this.extIsTarget)
		{
			if (this.SetExtStyle)
				this.SetExtStyle(targ);
		}
		else
		{
			if (this.SetVarStyle)
				this.SetVarStyle(targ);
		}
		return targ.rowDiv;
	}

	FMPROT.AddTargetFuncs = function (targ)
	{
		var me = this
		targ.ConnectorClick = function ()
		{
			if (this.hasChildren)
			{
				me.OpenMatchChild(this);
			}
			else
			{
				alert(this.name + ' Needs a New Copy Expression Dialog!');
			}
		}

		targ.UpdateConnection = function ()
		{
			var hasChildren, varToCheck, i, me2 = this, child, extPropObj;
			this.connector.onclick = function () { me2.ConnectorClick() };
			if (!this.linkedTo)
			{
				this.connector.style.visibility = 'hidden';
				return;
			}
			this.connector.style.visibility = 'visible';
			if (this.hasChildren)
			{
				if (me.extIsTarget) // src has extName
				{
					varToCheck = this.linkedTo;
				}
				else
				{
					varToCheck = this;
				}
				for (i = 0; i < varToCheck.children.length; i++)
				{
					child = varToCheck.children[i];
					extPropObj = (child.bindObj) ? child.bindObj[me.extPropName] : child[me.extPropName];
					if (extPropObj)
					{
						hasChildren = true;
						break;
					}
				}
				if (!hasChildren && varToCheck.newChildren)
				{
					for (i = 0; i < varToCheck.newChildren.length; i++)
					{
						child = varToCheck.newChildren[i];
						extPropObj = (child.bindObj) ? child.bindObj[me.extPropName] : child[me.extPropName];
						if (extPropObj)
						{
							hasChildren = true;
							break;
						}
					}
				}
				if (hasChildren)
				{
					this.connector.src = 'img/Connected.png';
					this.connector.title = 'Click to Update Group Connections';
				}
				else
				{
					this.connector.src = 'img/ConnectOpen.png';
					this.connector.title = 'Click to Create Group Connections';
				}
			}
			else
			{
				if (this.linkedTo.copyExp)
				{
					this.connector.src = 'img/CopyExp.png';
					this.connector.title = 'Click to Update Connection Copy Expression';
				}
				else
				{
					this.connector.src = 'img/Copy.png';
					this.connector.title = 'Default is copying value-click to create a copy expression';
				}
			}
		};
	}

	FMPROT.PositionNewTarg = function (targ)
	{
		var top = 0,
			 lastHeight = 0,
			 lastElem = null,
			 addSrc = null,
			 i, targ, elemTop, newTop, elem, me = this;
		for (i = 0; i < this.targets.length; i++)
		{
			targ = this.targets[i];
			if (!targ.type ||
			    (targ.type != '*add'))
			{
				elemTop = parseInt(targ.rowDiv.style.top);
				top = Math.max(elemTop, top);
				lastElem = targ.rowDiv;
			}
		}

		newTop = (lastElem == null) ?
				this.controlsTop + this.matchVertGap :
				top + lastElem.offsetHeight + this.matchVertGap;
		elem = targ.rowDiv;
		elem.style.top = newTop + 'px';
		elem.style.left = this.matchLeft + 'px';
		elem.style.width = this.matchWidth + 'px';
		targ.elem.style.width = this.targWidth + 'px';
		if (newTop + elem.offsetHeight + 4 > this.controlsBottom)
			window.setTimeout(function () { me.Resize(); }, 1);
	}

	FMPROT.FindLinks = function ()
	{
		if (this.linksFound)
			return;
		this.linksFound = true;
		flow.macs.PairOnExtNames(this.varRefs, this.extRefs, this.extPropName, this.onMissingMatch);
	}

	FMPROT.GetElemHtml = function (item, isTarget)
	{
		var t = item.name, imgText
		if (item.nameType)
			t += '<span>(' + item.nameType + ')</span>';
		if (item.hasChildren)
			t += '<img src="img/multi.gif" align="' + ((isTarget) ? 'left' : 'right') + '" class="multiimg" style="margin-' + ((isTarget) ? 'right' : 'left') + ':3px;"/>';
		return t;
	}

	FMPROT.Draw = function ()
	{
		var me = this, i, src, t, targ, className;
		this.FindLinks();
		if (this.extIsTarget)
		{
			if (!this.addingSrc && this.onNewVarRef)
				this.CreateAddSrc();
			if (!this.addingTarg && this.onNewExtRef && !this.holdNewExt)
				this.CreateAddTarget();
		}
		else
		{
			if (!this.addingSrc && this.onNewExtRef && !this.holdNewExt)
				this.CreateAddSrc();
			if (!this.addingTarg && this.onNewVarRef)
				this.CreateAddTarget();
		}
		this.titleElem = this.NewDiv('title', 'title', this.elem, this.title);
		this.actionsElem = this.NewDiv('actions', 'actions', this.elem);
		this.okBtn = this.NewButton('okBtn', 'OK', this.actionsElem);
		this.okBtn.onclick = function () { me.BtnAction('ok') };
		this.cancelBtn = this.NewButton('canBtn', 'Cancel', this.actionsElem);
		this.cancelBtn.onclick = function ()
		{
			me.BtnAction('cancel');
		};
		if (this.poolTitle && this.targTitle)
		{
			this.pHeaderElem = this.NewDiv('phead', 'header', this.elem, this.poolTitle);
			this.tHeaderElem = this.NewDiv('thead', 'header', this.elem, this.targTitle);
		}
		this.poolElem = this.NewDiv('pool', 'pool', this.elem);
		for (i = 0; i < this.sources.length; i++)
		{
			src = this.sources[i];
			if (src.type &&
				 (src.type == '*add'))
			{
				this.CreateAddSrcElem(src);
			}
			else
			{
				className = (this.extIsTarget) ? 'src macVar' : 'src ext';
				src.elem = this.NewDiv('src_' + src.name, className, this.elem,
														this.GetElemHtml(src, false));
				if (this.extIsTarget)
				{
					if (this.SetVarStyle)
						this.SetVarStyle(src);
				}
				else
				{
					if (this.SetExtStyle)
						this.SetExtStyle(src);
				}
			}
			this.SetDrag(src, 'src' + i);
		}
		this.matchElem = this.NewDiv('matcher', 'matcher', this.elem);
		for (i = 0; i < this.targets.length; i++)
		{
			targ = this.targets[i];
			this.CreateTargElem(targ, (targ.type && targ.type == '*add'));
		}
		for (i = 0; i < this.extRefs.length; i++)
		{
			this.SetupExtUpdate(this.extRefs[i]);
		}
		window.setTimeout(function () { me.Resize(); }, 1);
	}

	FMPROT.SetDrag = function (src, id)
	{
		var me = this;
		this.dragger.initDrag(src.elem, id, function (id, elem, leftX, topY, width, align)
		{
			me.SrcDragPos(id, elem, leftX, topY, width, align);
		}, function () { return 'move' });
	}

	FMPROT.MoveLinked = function ()
	{
		var s, src;
		for (var s = 0; s < this.sources.length; s++)
		{
			var src = this.sources[s];
			if (src.linkedTo)
			{
				this.activeMatch = src.linkedTo;
				this.TargetMatched(src, src.elem);
				if (this.extIsTarget)
					this.SetupVarUpdate(src);
				else
					this.SetupExtUpdate(src);
			}
		}
	}

	FMPROT.Resize = function ()
	{
		//first get width of pool and ext names
		var srcWidth = 40,
			 srcHeight = 0,
			 targWidth = this.targWidth,
			 rowHeight = 0,
			 poolVertGap = this.poolVertGap,
			 poolMargins = this.poolMargins,
			 matchVertGap = this.matchVertGap,
			 matchHorzGap = 18,
			 matchMargins = 4,
			 poolMatchGap = 4,
			 titleHeight = this.titleElem.offsetHeight + 4,
			 actionsHeight = this.actionsElem.offsetHeight + 4,
			 controlsTop = titleHeight,
			 i, src, docElem, maxHeight, maxWidth,
			 height, poolWidth, matchWidth, matchLeft, hHeight,
			 diff, mainWidth, top, elem;

		this.titleElem.style.top = '0px';
		for (i = 0; i < this.sources.length; i++)
		{
			srcWidth = Math.max(srcWidth, this.sources[i].elem.offsetWidth);
			srcHeight = Math.max(srcHeight, this.sources[i].elem.offsetHeight);
		}

		for (i = 0; i < this.targets.length; i++)
		{
			targWidth = Math.max(targWidth, this.targets[i].elem.offsetWidth);
			rowHeight = Math.max(rowHeight, this.targets[i].rowDiv.offsetHeight);
		}
		docElem = (this.htDoc.compatMode === "CSS1Compat") ?
									 this.htDoc.documentElement :
										this.htDoc.body;
		maxHeight = docElem.clientHeight - 40;
		maxWidth = docElem.clientWidth - 20;

		height = Math.max(3 + (srcHeight + poolVertGap) * this.sources.length,
									3 + (rowHeight + matchVertGap) * this.targets.length);
		height = Math.min(maxHeight - titleHeight - actionsHeight, height);
		poolWidth = poolMargins * 2 + srcWidth + 6; // border included
		matchWidth = matchMargins * 2 + srcWidth + matchHorzGap + targWidth + 4;
		matchLeft = poolWidth + poolMatchGap;
		if (this.pHeaderElem)
		{
			hHeight = this.pHeaderElem.offsetHeight;
			this.pHeaderElem.style.top = controlsTop + 'px';
			this.pHeaderElem.style.left = '5px';
			if (this.pHeaderElem.offsetWidth + 5 > poolWidth)
			{
				diff = this.pHeaderElem.offsetWidth + 5 - poolWidth;
				poolWidth += diff;
				matchLeft += diff;
			}
			if (this.tHeaderElem)
			{
				if (this.tHeaderElem.offsetWidth + 4 > targWidth)
				{
					diff = this.tHeaderElem.offsetWidth + 4 - targWidth;
					targWidth += diff;
					matchWidth += diff;
				}
				hHeight = Math.max(hHeight, this.tHeaderElem.offsetHeight);
				this.tHeaderElem.style.top = controlsTop + 'px';
				this.tHeaderElem.style.left = (matchLeft + matchWidth - targWidth - 4) + 'px';
			}
			controlsTop += hHeight;
		}

		this.poolElem.style.top = controlsTop + 'px';
		this.poolElem.style.width = poolWidth + 'px';
		this.poolElem.style.height = height + 'px';
		this.matchElem.style.left = matchLeft + 'px';
		this.matchElem.style.width = (matchWidth + 12) + 'px';
		this.matchElem.style.top = controlsTop + 'px';
		this.matchElem.style.height = height + 'px';
		mainWidth = matchLeft + matchWidth + 18;
		this.controlsTop = controlsTop;
		this.srcWidth = srcWidth;
		this.srcLeft = 3 + poolMargins;
		top = controlsTop + poolVertGap;
		for (i = 0; i < this.sources.length; i++)
		{
			src = this.sources[i];
			elem = src.elem;
			elem.style.width = srcWidth + 'px';
			if (src.linkedTo)
				continue; // handled in MoveLinked
			elem.style.left = this.srcLeft + 'px';
			elem.style.top = top + 'px';
			top += srcHeight + poolVertGap;
		}
		top = controlsTop + matchVertGap;
		matchLeft += matchMargins;
		this.matchLeft = matchLeft;
		this.matchWidth = matchWidth;
		this.targWidth = targWidth;
		for (i = 0; i < this.targets.length; i++)
		{
			this.targets[i].elem.style.width = targWidth + 'px';
			elem = this.targets[i].rowDiv;
			elem.style.left = matchLeft + 'px';
			elem.style.top = top + 'px';
			elem.style.width = matchWidth + 'px';
			top += rowHeight + matchVertGap;
		}
		this.actionsElem.style.top = (controlsTop + height + 7) + 'px';
		this.actionsElem.style.left = Math.floor(mainWidth / 2 - this.actionsElem.offsetWidth / 2) + 'px';
		this.titleElem.style.left = Math.floor(mainWidth / 2 - this.titleElem.offsetWidth / 2) + 'px';
		this.controlsBottom = controlsTop + height;
		height = controlsTop + height + actionsHeight + 10;
		this.winTop = 150;
		this.width = mainWidth;
		this.dragger.minX = 5;
		this.dragger.minY = 5;
		this.dragger.topX = mainWidth;
		this.dragger.topY = height;
		this.dragger.owner = this;
		this.MoveLinked();
		this.Show(this.onClose, mainWidth, height);
	}
} ());
