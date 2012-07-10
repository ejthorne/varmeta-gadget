// Module Pattern for best performance and non-global vars
/// <reference path="../SCMacros.js" />
/// <reference path="../DynWin.js" />
/// <reference path="../ScreenInfo.js" />
/// <reference path="../MacDesign.js" />
/// <reference path="../FlowEdit.js" />
/// <reference path="../MacrosMgr.htm" />
/// <reference path="../Plugin.js" />
/// <reference path="ActionBlock.js" />
/// <reference path="ActionEditor.js" />
/// <reference path="CoreActions.js" />
(function ()
{
	var actionHeight = 20,
		 srcWidth = 175,
		 actionGap = 4,
		 actionLeftMargin = 2,
		 poolLogicGap = 8,
		 containerBorderWidth = 5,
		 containerBottomHeight = 10,
		 containerBottomWidth = 50,
		 dropGap = 10,
		 dropOverlap = 10,
		 vertMid = 10,
		 actionZIndex = 10,
		 poolVertGap = 4,
		 poolMargins = 4,
		 imgPath = 'img/',
		 dragOpacity = 0.5;

	//------------------------- ActionBlock Designer ----------------------------------
	flow.logic.ActionBlockDesigner = function (htDoc, id, parent, runtime, asChild, design, actionBlock, onClose)
	{
		if (!htDoc)
			return;
		var asName = (typeof actionBlock === 'string');
		flow.macs.DynWin.call(this, htDoc, parent, asChild); // When asChild, do not provide list of OK actions
		this.onClose = onClose;
		this.runtime = runtime;
		if (asName)
		{
			if (actionBlock == "Work")
				this.actionBlock = new flow.logic.WorkBlock(runtime, "Work");
			else
				this.actionBlock = new flow.logic.ActionBlock(runtime, actionBlock);
		}
		else
			this.actionBlock = actionBlock;
		this.design = design;
		this.srcActions = [];
		this.title = 'Design the ' + this.actionBlock.name + ' Logic Flow';
		this.poolTitle = 'Available Actions';
		this.logicTitle = 'Logic Flow - Build from Available Actions';
		this.modal = (asChild) ? false : true;
		this.init('ABD_' + id, this.title, this.modal, (parent) ? this.GetNewZIndex(parent) : 1000);
		this.dragger = new flow.macs.DragMgr((htDoc.parentWindow) ? htDoc.parentWindow : htDoc.defaultView);
		this.dragger.dragOpacity = dragOpacity;
		if (asName)
			this.actionBlock.GetDesign(design);
	}
	flow.logic.ActionBlockDesigner.prototype = new flow.macs.DynWin();
	var BDPROT = flow.logic.ActionBlockDesigner.prototype; //convenience
	BDPROT.constructor = flow.logic.ActionBlockDesigner;

	BDPROT.RefreshSrcActions = function (initializing)
	{
		var filters = this.actionBlock.GetListFilters(),
			 actionRefs = this.runtime.GetActions(filters),
			 i, actionRef, existing = {}, id, srcAction, initial;
		initial = (this.srcActions.length = 0);

		if (!initial)
		{
			for (i = 0; i < this.srcActions.length; i++)
			{
				existing[this.srcActions[i].id] = { "index": i, "active": false };
			}
		}

		for (i = 0; i < actionRefs.length; i++)
		{
			actionRef = actionRefs[i];
			if (!initial && existing[actionRef.id])
				existing[actionRef.id].active = true;
			else
			{
				this.srcActions.push(this.CreateActionSrc(actionRef));
			}
		}
		if (!initial)
		{
			for (id in existing)
			{
				if (!existing[id].active)
				{
					for (i = 0; i < this.srcActions.length; i++)
					{
						if (this.srcActions[i].id == id)
						{
							this.srcActions[i].elem.visibility = 'hidden';
							this.elem.removeChild(this.srcActions[i].elem);
							this.srcActions.splice(i, 1);
							break;
						}
					}
				}
			}
		}
		if (!initializing)
			this.PositionPoolElems();
	}

	BDPROT.CreateActionSrc = function (actionRef)
	{
		var srcIndex = this.srcActions.length, elem;
		this.addingSrcCount++;
		elem = this.CreateSrcElem(actionRef);
		this.SetDrag(actionRef, actionRef.id);
		return actionRef;
	}

	BDPROT.CreateSrcElem = function (actionRef)
	{
		var me = this, elem, textElem;
		elem = actionRef.elem = this.NewDiv('src_' + actionRef.id, 'logic newLogic', this.elem,
														'<span>' + actionRef.title + '</span>');
		elem.title = 'Drag and Drop to add/insert this Action to the Main or Workers Logic';

		textElem = elem.firstChild;
		textElem.style.zIndex = 5;
		textWidth = textElem.offsetWidth;
		textHeight = textElem.offsetHeight;
		elem.style.width = srcWidth + 'px';
		elem.style.height = '20px';
		textElem.style.left = '28px';
		textElem.style.top = Math.floor(10 - textHeight / 2) + 'px';
		this.AddImg(elem, 'ActionLFCap', 0, 0, 8, 20, 1);
		this.AddImg(elem, 'ActionMid', 8, 0, srcWidth - 17, 20, 1);
		this.AddImg(elem, 'ActionRtCap', srcWidth - 9, 0, 9, 20, 1);
		iconElem = this.AddImg(elem, actionRef.icon, 8, 1, 18, 18, 2, 'ic');
		elem.title = 'Drag and Drop to add/insert this Action to the Active Logic';
		return elem;
	}

	BDPROT.ToVarClicked = function (ev, imgElem)
	{
		var e = this.GetEvent(ev);
		if (this.draggedSrc)
			return true;
		var id = imgElem.id.substring(2),
			 action = this.actionIds[id];
		this.OpenActionMerge(action, true);
		return this.CancelEv(e);
	}

	BDPROT.FromExtClicked = function (ev, imgElem)
	{
		var e = this.GetEvent(ev);
		if (this.draggedSrc)
			return true;
		var id = imgElem.id.substring(2),
			 action = this.actionIds[id];
		this.OpenActionMerge(action, false);
		return this.CancelEv(e);
	}

	BDPROT.OpenActionMerge = function (action, toVar)
	{
		var me = this,
			 designer = action.GetDesigner(this.htDoc, this.elem);
		designer.ShowMergeOnly(function (msg)
		{
			if (msg == 'ok')
			{
				//alert("merge was ok!");
			}
		});
	}

	BDPROT.ActionClicked = function (ev, actionElem, fromIcon)
	{
		var e = this.GetEvent(ev),
			 editor,
			 me = this,
			 currentName;
		if (this.draggedSrc)
			return true;
		var id = actionElem.id,
			 action = this.actionIds[((fromIcon) ? id.substring(2) : id)];
		currentName = action.name;
		editor = new flow.logic.ActionEditor(action, this.htDoc, this.elem, this.runtime, this.design, action.container);
		editor.Display(function (obj, msg)
		{
			if (msg == 'ok')
			{
				if (action.name != currentName)
					window.setTimeout(function () { me.RedrawLogic() }, 1);
			}
		});
		return this.CancelEv(e);
	}

	BDPROT.OKClick = function ()
	{
		this.actionBlock.SaveDesign(this.design);
		this.BtnAction('ok', this.actionBlock);
	}

	BDPROT.Draw = function ()
	{
		var me = this, i, src, t, targ, className;
		if (this.displayOnly)
		{
			this.elem.style.width = this.width + 'px';
			this.elem.style.height = this.height + 'px';
			this.elem.style.position = 'absolute';
			this.elem.style.visibility = 'visible';
		}
		else
		{
			this.titleElem = this.NewDiv('title', 'title', this.elem, this.title);
			this.actionsElem = this.NewDiv('actions', 'actions', this.elem);
			this.okBtn = this.NewButton('okBtn', 'OK', this.actionsElem);
			this.okBtn.onclick = function () { me.OKClick() };
			this.cancelBtn = this.NewButton('canBtn', 'Cancel', this.actionsElem);
			this.cancelBtn.onclick = function ()
			{
				me.BtnAction('cancel');
			};
			if (this.poolTitle && this.logicTitle)
			{
				this.pHeaderElem = this.NewDiv('phead', 'header', this.elem, this.poolTitle);
				this.lHeaderElem = this.NewDiv('lhead', 'header', this.elem, this.logicTitle);
			}
			this.poolElem = this.NewDiv('pool', 'logicpool', this.elem);
			this.RefreshSrcActions(true);
			this.insertElem = this.NewDiv('insAt', 'actionInsert', this.elem);
		}
		if (this.logicElem)
		{
			this.logicElem.innerHTML = '';
			this.elem.removeChild(this.logicElem);
		}
		this.DrawLogic(this.elem, this.actionBlock);
		this.logicElem = this.actionBlock.elem;
		this.logicElem.style.height = this.logicHeight + 'px';
		this.logicElem.style.width = this.logicWidth + 'px';
		if (!this.displayOnly)
			window.setTimeout(function () { me.Resize(); }, 1);
	}

	BDPROT.AddImg = function (parent, src, left, top, width, height, zIndex, id)
	{
		var img = this.htDoc.createElement('img');
		if (id)
			img.id = id + parent.id;
		img.src = imgPath + src + '.png';
		img.width = width;
		img.height = height;
		parent.appendChild(img);
		img.style.left = left + 'px';
		img.style.top = top + 'px';
		img.style.zIndex = zIndex;
		return img;
	}

	BDPROT.DrawLogic = function (parent, block)
	{
		var position =
		{
			"top": actionGap,
			"left": actionLeftMargin,
			"zindex": actionZIndex,
			"maxLeft": 0,
			"maxRight": 0,
			"width": 0
		}
		this.actionIds = {};
		this.actionCount = 0;
		block.elem = this.NewDiv('LB_' + block.name, 'actionContainer', parent);
		block.elem.style.left = 0;
		block.elem.style.top = 0;
		block.elem.style.width = '1000px';
		block.elem.style.height = '2000px';
		block.elem.innerHTML = ''; // clear anything already there...
		this.DrawActions(block.elem, this.actionBlock, position);
		if (this.displayOnly)
		{
			this.logicHeight = this.height;
			this.logicWidth = this.width;
			position.center = Math.floor(this.logicWidth / 2);
		}
		else
			position.center = position.maxLeft + 10;
		this.SetLefts(block.elem, this.actionBlock, position);

		if (!this.displayOnly)
		{
			this.logicHeight = position.top + 30;
			this.logicWidth = 50 + position.maxLeft + position.maxRight
		}
		block.elem.style.height = this.logicHeight + 'px';
		block.elem.style.width = this.logicWidth + 'px';
	}

	BDPROT.DrawActions = function (parent, block, position)
	{
		var i;
		for (i = 0; i < block.children.length; i++)
		{
			this.DrawAction(parent, block.children[i], position);
		}
		return position;
	}

	BDPROT.SetLefts = function (parent, block, position)
	{
		var i;
		for (i = 0; i < block.children.length; i++)
		{
			this.SetActLeft(parent, block.children[i], position);
		}
		return position;
	}

	BDPROT.SetActLeft = function (parent, action, position)
	{
		var left = position.center + action.centerAdj,
		 childPosition, i;

		action.elem.style.left = left + 'px';
		if (action.children)
		{
			childPosition = { "center": position.center - left };
			this.SetLefts(parent, action, childPosition);
		}
	}

	BDPROT.NewActElem = function (action, id, parent)
	{
		var elemId = 'act_' + id,
			 elem = this.htDoc.createElement('div');
		this.actionIds[elemId] = action;
		elem.id = elemId;
		elem.className = 'logic newLogic';
		elem.innerHTML = '<span>' + action.name + '</span>';
		parent.appendChild(elem);
		action.elem = elem;
		return elem;
	}

	BDPROT.DrawAction = function (parent, action, position)
	{
		var me = this,
			 index = this.actionCount++,
			 id = 'LGA' + index,
			 iconElem = null,
			 toVarElem = null,
			 fromExtElem = null,
			 textWidth, leftWidth, textHeight, textMid, textElem, width, height, top,
			 elem, childPosition,
			 inline = action.inline;

		if (inline &&
			 (position.top < 15))
			inline = false;
		elem = this.NewActElem(action, id, parent);
		elem.style.top = position.top + 'px';
		textElem = elem.firstChild;
		textElem.style.zIndex = 5;
		textWidth = textElem.offsetWidth;
		textHeight = textElem.offsetHeight;
		switch (action.view)
		{
			case 'tovar': //Height:25, tops=0 actionLFCap.png (8x20), Icon (18x18), ActionMid.png (1x20) text, ActionToVar.png (9x25)
				width = textWidth + 37;
				if (action.needsMatch)
					width += 20;
				position.maxLeft = Math.max(position.maxLeft, width);
				action.centerAdj = width * -1;
				height = 25;
				elem.style.height = '25px';
				elem.style.width = width + 'px';
				textElem.style.left = '28px';
				textMid = 10;
				this.AddImg(elem, 'ActionLFCap', 0, 0, 8, 20, 1);
				this.AddImg(elem, 'ActionMid', 8, 0, width - 17, 20, 1);
				this.AddImg(elem, 'ActionToVar', width - 9, 0, 9, 25, 1);
				iconElem = this.AddImg(elem, action.icon, 8, 1, 18, 18, 2, 'ic');
				if (action.needsMatch)
					toVarElem = this.AddImg(elem, 'ToVar', width - 27, 1, 18, 18, 2, 'tv');
				break;
			case 'toext': //Height:25, top=0 ActionToExt.png (8x25), tops=5 -ActionMid.png (1x20) 
				// ToVar.png/ToVarReady.png (18x18), Text, icon (18x18), ActionRtCap.png (8x20)
				width = textWidth + 53;
				height = 25;
				position.maxRight = Math.max(position.maxRight, width);
				action.centerAdj = 0;
				elem.style.height = '25px';
				elem.style.width = width + 'px';
				textElem.style.left = '28px';
				textMid = 15;
				this.AddImg(elem, 'ActionToExt', 0, 0, 8, 25, 1);
				this.AddImg(elem, 'ActionMid', 8, 5, textWidth + 38, 20, 1);
				this.AddImg(elem, 'ActionRtCap', textWidth + 46, 5, 8, 20, 1);
				toVarElem = this.AddImg(elem, 'ToVar', 8, 6, 18, 18, 2, 'tv');
				iconElem = this.AddImg(elem, action.icon, textWidth + 30, 6, 18, 18, 2, 'ic');
				break;
			case 'middle': //Height:20, top=0, ActionLFCap.png (8x20), icon (18x18), text, ActionMid.png (1x20), ActionRtCap.png (8x20)
				width = textWidth + 36;
				height = 20;
				action.centerAdj = width / 2 * -1;
				position.maxRight = Math.max(position.maxRight, width / 2);
				position.maxLeft = Math.max(position.maxLeft, width / 2);
				elem.style.height = '20px';
				elem.style.width = width + 'px';
				textElem.style.left = '28px';
				textMid = 10;
				this.AddImg(elem, 'ActionLFCap', 0, 0, 8, 20, 1);
				this.AddImg(elem, 'ActionMid', 8, 0, textWidth + 20, 20, 1);
				this.AddImg(elem, 'ActionRtCap', textWidth + 28, 0, 9, 20, 1);
				iconElem = this.AddImg(elem, action.icon, 8, 1, 18, 18, 2, 'ic');
				break;
			case 'call':  // Height:49, top=0, ActionLFCap.png (8x20), icon (18x18), text, ActionMid.png (1x20), ToVar.png/ToVarReady.png (18x18)
				// ActionCallJoin.png (9x44), top=24, ActionMid.png (1x20), FromExt.png/FromExtReady.png (18x18), ActionReturn.png (9x25)
				height = 49;
				width = textWidth + 58;
				position.maxRight = Math.max(position.maxRight, 40);
				position.maxLeft = Math.max(position.maxLeft, width - 40);
				action.centerAdj = (width - 40) * -1;
				elem.style.height = '49px';
				elem.style.width = width + 'px';
				textElem.style.left = '28px';
				textMid = 10;
				this.AddImg(elem, 'ActionLFCap', 0, 0, 8, 20, 1);
				this.AddImg(elem, 'ActionMid', 8, 0, width - 17, 20, 1);
				this.AddImg(elem, 'ActionCallJoin', textWidth + 49, 0, 9, 44, 1);
				this.AddImg(elem, 'ActionMid', width - 31, 24, 22, 20, 1);
				this.AddImg(elem, 'ActionReturn', width - 40, 24, 9, 25, 1);
				iconElem = this.AddImg(elem, action.icon, 8, 1, 18, 18, 2, 'ic');
				toVarElem = this.AddImg(elem, 'ToVar', width - 27, 1, 18, 18, 2, 'tv');
				fromExtElem = this.AddImg(elem, 'FromExt', width - 27, 25, 18, 18, 2, 'fm');
				break;
			case 'container': // Height:30+ContainerHeight+20 for insert ContOpen.png (9x22), ActionMid.png, Icon (18x18), Text,
				// ActionFromVar.png (8x25), ContVertBar.png (7x1), ContClose.png (10x9), ContBotMid.png (1x5), 
				// contBotend.png (5x5)
				childPosition =
				{
					"top": actionGap,
					"left": actionLeftMargin,
					"zindex": actionZIndex,
					"maxLeft": 0,
					"maxRight": 0,
					"width": 0
				}
				childPosition.top += ((inline) ? 25 : 20);
				elem.style.width = '1000px';
				elem.style.height = '2000px';
				this.DrawActions(elem, action, childPosition);
				height = 20 + childPosition.top;
				elem.style.height = height + 'px';
				leftWidth = Math.max(textWidth + 37 + ((action.needsMatch) ? 18 : 0), childPosition.maxLeft + actionLeftMargin + 7);
				width = leftWidth + childPosition.maxRight + 15;
				position.maxRight = Math.max(position.maxRight, width - leftWidth);
				position.maxLeft = Math.max(position.maxLeft, leftWidth);
				action.centerAdj = leftWidth * -1;
				elem.style.width = width + 'px';
				textElem.style.left = '29px';
				textMid = (inline) ? 15 : 10;
				top = (inline) ? 5 : 0;
				this.AddImg(elem, 'ContOpen', 0, top, 9, 22, 1);
				this.AddImg(elem, 'ActionMid', 9, top, leftWidth - 17, 20, 1);
				if (inline)
					this.AddImg(elem, 'ActionFromVar', leftWidth - 8, 0, 8, 25, 1);
				else
					this.AddImg(elem, 'ActionRtCap', leftWidth - 8, 0, 8, 20, 1);
				this.AddImg(elem, 'ContVertBar', 0, top + 22, 7, height - 31 - top, 1);
				this.AddImg(elem, 'ContClose', 0, height - 9, 10, 9, 1);
				this.AddImg(elem, 'ContBotMid', 10, height - 5, width - 15, 5, 1);
				this.AddImg(elem, 'ContBotEnd', width - 5, height - 5, 5, 5, 1);
				if (action.needsMatch)
					fromExtElem = this.AddImg(elem, 'FromExt', leftWidth - 23, top + 1, 18, 18, 2, 'fe');
				iconElem = this.AddImg(elem, action.icon, 9, top + 1, 18, 18, 2, 'ic');
				break;
		}
		if (toVarElem)
		{
			this.CaptureClick(toVarElem, function (event) { return me.ToVarClicked(event, this) });
		}
		if (fromExtElem)
		{
			this.CaptureClick(fromExtElem, function (event) { return me.FromExtClicked(event, this) });
		}
		if (this.displayOnly)
		{
			elem.style.cursor = 'pointer';
			elem.onclick = function (event) { return me.ActionClicked(event, this) };
		}
		else
		{
			if (iconElem)
				this.CaptureClick(iconElem, function (event) { return me.ActionClicked(event, this, true) });
			this.SetDrag(action, elem.id, true, function (event) { return me.ActionClicked(event, this) });
		}
		textElem.style.top = Math.floor(textMid - textHeight / 2) + 'px';
		position.top += (height + actionGap);
		return position;
	}

	BDPROT.ADragMM = function (id, elem, mouseX, mouseY)
	{
		var winLeft = parseInt(elem.style.left),
			 winTop = parseInt(elem.style.top),
			 intraX = mouseX - winLeft,
			 intraY = mouseY - winTop;

		if ((elem.id != '') &&
			 (elem.id != id))
			return 'none';
		elem.style.cursor = 'move';
		return elem.style.cursor;
	}


	BDPROT.SetDrag = function (src, id, liveAction, clickFunc)
	{
		var me = this,
			 mmFunc = (liveAction) ? me.ADragMM : function () { return 'move' };
		this.dragger.initDrag(src.elem, id, function (id, elem, leftX, topY, width, align)
		{
			me.SrcDragPos(id, elem, leftX, topY, width, align, liveAction);
		}, mmFunc);
		if (clickFunc)
			src.ontouchend = src.onmouseup = clickFunc;
	}

	BDPROT.FindSrcById = function (id)
	{
		var i;
		for (i = 0; i < this.srcActions.length; i++)
		{
			if (this.srcActions[i].id == id)
				return this.srcActions[i];
		}
		return null;
	}

	BDPROT.ShowTrash = function ()
	{
		var me = this,
			 parent = this.actionBlock.elem,
			 trashElem;
		trashElem = this.getDivById('ltrash');
		if (!trashElem)
			trashElem = this.NewDiv('ltrash', 'absimg', parent, '<img src="img/trash.png" width="25" height="30" />');
		this.trashLeft = parent.offsetWidth - 29;
		this.trashTop = parent.offsetHeight - 34;
		trashElem.style.visibility = 'visible';
		trashElem.style.zIndex = 20;
		trashElem.style.top = this.trashTop + 'px';
		trashElem.style.left = this.trashLeft + 'px';
		trashElem.style.border = '1px solid #2A331E';
		this.trashElem = trashElem;
	}

	BDPROT.HideTrash = function ()
	{
		var trashElem = this.getDivById('ltrash');
		if (trashElem)
		{
			trashElem.style.zIndex = -1;
			trashElem.style.visibility = 'hidden';
		}
		this.trashLeft = 2000;
		this.trashBottom = -20;
		this.trashElem = null;
	}

	BDPROT.SrcDragPos = function (dragid, elem, leftX, topY, width, align, liveAction)
	{
		var src = (liveAction) ? this.actionIds[dragid] : this.FindSrcById(dragid),
			hoverTarg = null,
			me = this, trueLeftTop = null;
		if (align)
		{
			if (this.activeInsertPoint)
				this.ActionInsert(src, elem, liveAction);
			else if (liveAction && src.dragContainer)
			{
				if (this.trashInsert)
				{
					window.setTimeout(function () { me.RedrawLogic() }, 1);
				}
				else
				{
					src.dragContainer.RestoreAction();
				}
				src.dragContainer = null;
			}
			window.setTimeout(function () { me.draggedSrc = null }, 500);
			return;
		}
		if (this.draggedSrc != src)
		{
			this.draggedSrc = src;
			if (liveAction)
			{
				trueLeftTop = this.GetTrueLeftTop(src, leftX, topY);
				this.dragger.minX = leftX - trueLeftTop.left;
				this.dragger.minY = topY - trueLeftTop.top;
				this.dragger.topX = this.actionBlock.elem.offsetWidth + this.dragger.minX - 5;
				this.dragger.topY = this.actionBlock.elem.offsetHeight + this.dragger.minY - 5;
				if (src.container)
				{
					src.dragContainer = src.container;
					src.SetContainer(null);
				}
				this.ShowTrash();
			}
			else
			{
				this.dragger.minX = 0;
				this.dragger.minY = 0;
				this.dragger.topX = this.elem.offsetWidth - 40;
				this.dragger.topY = this.elem.offsetHeight - 50;
			}
		}

		if (liveAction)
		{
			if (!trueLeftTop)
				trueLeftTop = this.GetTrueLeftTop(src, leftX, topY);

			leftX = trueLeftTop.left;
			topY = trueLeftTop.top;
		}
		if (liveAction ||
			 (leftX + width > this.logicLeft))
		{
			hoverTarg = this.LogicHover(leftX, topY, width, elem.offsetHeight, liveAction);
		}
		if (!hoverTarg)
			this.RemoveHoverHighlight();
	}

	BDPROT.ActionInsert = function (src, elem, liveAction)
	{
		var block = this.activeInsertPoint.block,
			 insertAt = this.activeInsertPoint.insertAt,
			 me = this, editor, cancelled = false;

		if (liveAction)
		{
			if (src.SetContainer)
				src.SetContainer(null);
			block.InsertAction(src, insertAt);
			window.setTimeout(function () { me.RedrawLogic() }, 1);
		}
		else
		{
			editor = new flow.logic.ActionEditor(src.id, this.htDoc, this.elem, this.runtime, this.design, block);
			editor.Display(function (obj, msg)
			{
				if (msg == 'ok')
				{
					window.setTimeout(function () { me.RedrawLogic() }, 1);
				}
			});
		}
		this.RemoveHoverHighlight();
	}

	BDPROT.RedrawLogic = function ()
	{
		this.DrawLogic(this.elem, this.actionBlock);
		if (!this.displayOnly)
			this.Resize();
	}

	BDPROT.RemoveHoverHighlight = function ()
	{
		var block;
		if (this.activeInsertPoint)
		{
			block = this.activeInsertPoint.block;
			if (block.elem.className.indexOf('logic') != -1)
				block.elem.className = 'logic';
			else
				block.elem.className = 'actionContainer';
			this.activeInsertPoint = null;
			this.insertElem.style.visibility = 'hidden';
		}
	}

	BDPROT.GetTrueLeftTop = function (action, left, top)
	{
		var offsetAction = (action.container) ? action.container : (action.dragContainer) ? action.dragContainer : null;
		while (offsetAction && offsetAction.container)
		{
			left += parseInt(offsetAction.elem.style.left);
			top += parseInt(offsetAction.elem.style.top);
			offsetAction = offsetAction.container;
		}
		return { "left": left, "top": top };
	}

	BDPROT.LogicHover = function (leftX, topY, width, height, liveAction)
	{
		if (liveAction)
		{
			if (this.trashElem &&
				 (leftX + width > this.trashLeft) &&
				 (topY + height > this.trashTop))
			{
				this.RemoveHoverHighlight();
				this.activeInsertPoint = null;
				this.trashElem.style.border = '1px solid yellow';
				this.trashInsert = true;
				return null;
			}
			else
			{
				this.trashInsert = false;
				if (this.trashElem)
					this.trashElem.style.border = '1px solid #2A331E';
			}
			leftX += this.logicLeft;
			topY += this.logicTop;
		}
		var insertPoint = this.FindInsertPoint(this.actionBlock, leftX,
																			topY, width, height, true);
		if (insertPoint)
		{
			this.RemoveHoverHighlight();
			this.activeInsertPoint = insertPoint;
			if (this.CompatibleDrop(this.draggedSrc, insertPoint.block))
			{
				if (insertPoint.block.elem.className.indexOf('logic') != -1)
					insertPoint.block.elem.className = 'logic dropOK';
				else
					insertPoint.block.elem.className = 'actionContainer dropOK';
				this.ShowInsertPoint(this.actionBlock, insertPoint, 0, 0);
			}
			else
			{
				insertPoint.insertAt = -1; // not valid for drop...
				if (insertPoint.block.elem.className.indexOf('logic') != -1)
					insertPoint.block.elem.className = 'logic dropBad';
				else
					insertPoint.block.elem.className = 'actionContainer dropBad';
			}
		}
		return insertPoint;
	}

	BDPROT.FindInsertPoint = function (actionBlock, leftX, topY, width, height, topContainer)
	{
		var i, elem, myTop, myLeft,
			 actionElem, actionTop, actionBottom, actionMid,
			 midY, action, trueLeftTop;

		elem = actionBlock.elem;
		myTop = parseInt(elem.style.top);
		myLeft = parseInt(elem.style.left);
		if ((topY + height > myTop) &&
			 (topY < myTop + elem.offsetHeight) &&
	  	    (leftX + width > myLeft))
		{
			topY -= myTop;
			leftX -= myLeft;
			if (actionBlock.children.length == 0)
			{
				if (topContainer)
				{
					myTop = 0;
					myLeft = 0;
				}
				else
				{
					myTop += 28;
					myLeft += 8;
				}
				trueLeftTop = this.GetTrueLeftTop(actionBlock, myLeft + actionLeftMargin, myTop + actionGap);
				return { "block": actionBlock, "insertAt": 0, "top": trueLeftTop.top, "left": trueLeftTop.left, "width": elem.offsetWidth - 10 };
			}
			midY = topY + vertMid;
			for (i = 0; i < actionBlock.children.length; i++)
			{
				action = actionBlock.children[i];
				actionElem = action.elem;
				actionTop = parseInt(actionElem.style.top);
				if (midY <= actionTop)
				{
					trueLeftTop = this.GetTrueLeftTop(action, parseInt(actionElem.style.left) + 3, actionTop - actionGap);
					return { "block": actionBlock, "insertAt": i, "top": trueLeftTop.top, "left": trueLeftTop.left, "width": actionElem.offsetWidth - 5 };
				}
				actionBottom = actionTop + actionElem.offsetHeight;
				if ((midY > actionTop) &&
					 (midY < actionBottom))
				{
					// Action must be a container...if not, insert before or after
					if (action.children)
					{
						return this.FindInsertPoint(action, leftX, topY, width, height, false);
					}
					else
					{
						actionMid = actionTop + 4 + (actionBottom - actionTop) / 2;
						if (midY < actionMid)
						{
							trueLeftTop = this.GetTrueLeftTop(action, parseInt(actionElem.style.left) + 3, actionTop - actionGap);
							return { "block": actionBlock, "insertAt": i, "top": trueLeftTop.top, "left": trueLeftTop.left, "width": actionElem.offsetWidth - 5 };
						}
						else
						{
							trueLeftTop = this.GetTrueLeftTop(action, parseInt(actionElem.style.left) + 3, actionBottom + 1);
							return { "block": actionBlock, "insertAt": i + 1, "top": trueLeftTop.top, "left": trueLeftTop.left, "width": actionElem.offsetWidth - 5 };
						}
					}
				}
			}
			trueLeftTop = this.GetTrueLeftTop(action, parseInt(actionElem.style.left) + 3, actionBottom + 1);
			return { "block": actionBlock, "insertAt": actionBlock.children.length, "top": trueLeftTop.top, "left": trueLeftTop.left, "width": actionElem.offsetWidth - 5 };
		}
		return null;
	}

	BDPROT.ShowInsertPoint = function (block, insertPoint, leftAdj, topAdj)
	{
		var i, action;
		leftAdj += parseInt(block.elem.style.left);
		topAdj += parseInt(block.elem.style.top);
		this.insertElem.style.left = (insertPoint.left + leftAdj) + 'px';
		this.insertElem.style.top = (insertPoint.top + topAdj) + 'px';
		this.insertElem.style.width = insertPoint.width + 'px';
		this.insertElem.style.visibility = 'visible';
		return true;
	}

	BDPROT.CompatibleDrop = function (src, block)
	{
		return block.CheckActionOK(src.id);
	}

	BDPROT.CalcSrcDims = function ()
	{
		var newWidth = 0;
		var newHeight = 0;
		for (i = 0; i < this.srcActions.length; i++)
		{
			newWidth = Math.max(this.srcActions[i].elem.offsetWidth, newWidth);
			newHeight = Math.max(this.srcActions[i].elem.offsetHeight, newHeight);
		}
		this.srcWidth = newWidth;
		this.srcHeight = newHeight;
	}

	BDPROT.PositionPoolElems = function (skipCalc)
	{
		var top = 0,
			 newTop = this.controlsTop + poolVertGap,
			 newWidth, newHeight, srcLeft = this.srcLeft,
			 i, src, elem, src;

		if (!skipCalc)
			this.CalcSrcDims();
		newWidth = this.srcWidth;
		newHeight = actionHeight;
		for (i = 0; i < this.srcActions.length; i++)
		{
			src = this.srcActions[i];
			src.top = newTop;
			elem = src.elem;
			elem.style.top = newTop + 'px';
			elem.style.left = srcLeft + 'px';
			elem.style.width = newWidth + 'px';
			elem.style.height = newHeight + 'px';

			newTop += newHeight + poolVertGap;
		}
		this.poolElemsHeight = newTop;
	}

	BDPROT.Resize = function ()
	{
		//first get width of pool and logic
		var srcWidth = 0,
			 srcHeight = 0,
			 rowHeight = 0,
			 titleHeight = this.titleElem.offsetHeight + 4,
			 actionsHeight = this.actionsElem.offsetHeight + 4,
			 controlsTop = titleHeight,
			 i, src, docElem, maxHeight, maxWidth,
			 height, poolWidth, hHeight,
			 logicLeft,
			 diff, mainWidth, top, elem;

		if (this.displayOnly)
			return;
		this.titleElem.style.top = '0px';

		docElem = (this.htDoc.compatMode === "CSS1Compat") ?
									 this.htDoc.documentElement :
										this.htDoc.body;
		maxHeight = docElem.clientHeight - 80;
		maxWidth = docElem.clientWidth - 20;
		this.CalcSrcDims();
		srcWidth = this.srcWidth;
		srcHeight = this.srcHeight;
		this.srcLeft = 3 + poolMargins;

		height = Math.max(3 + (srcHeight + poolVertGap) * this.srcActions.length,
									3 + this.logicHeight);
		poolWidth = poolMargins * 2 + srcWidth + 6; // border included
		logicLeft = poolWidth + poolLogicGap;
		logicWidth = this.logicWidth;
		if (this.pHeaderElem)
		{
			hHeight = this.pHeaderElem.offsetHeight;
			this.pHeaderElem.style.top = controlsTop + 'px';
			this.pHeaderElem.style.left = '5px';
			if (this.pHeaderElem.offsetWidth + 5 > poolWidth)
			{
				diff = this.pHeaderElem.offsetWidth + 5 - poolWidth;
				poolWidth += diff;
				logicLeft += diff;
			}
			if (this.lHeaderElem)
			{
				if (this.lHeaderElem.offsetWidth + actionLeftMargin > this.logicWidth)
				{
					diff = this.lHeaderElem.offsetWidth + actionLeftMargin - this.logicWidth;
					logicWidth += diff;
				}
				hHeight = Math.max(hHeight, this.lHeaderElem.offsetHeight);
				this.lHeaderElem.style.top = controlsTop + 'px';
				this.lHeaderElem.style.left = (logicLeft + actionLeftMargin) + 'px';
			}
			controlsTop += hHeight;
		}
		height = Math.min(maxHeight - titleHeight - actionsHeight - hHeight, height);
		this.logicLeft = logicLeft;
		if (logicLeft + logicWidth + actionLeftMargin > maxWidth)
		{
			logicWidth = maxWidth - logicLeft - actionLeftMargin;
		}
		if (this.logicWidth != logicWidth)
		{
			this.logicWidth = logicWidth;
			this.logicElem.style.width = logicWidth + 'px';
		}
		if (this.logicHeight > height)
		{
			this.logicHeight = height;
			this.logicElem.style.height = height + 'px';
		}
		this.controlsTop = controlsTop;

		this.poolElem.style.top = controlsTop + 'px';
		this.poolElem.style.width = poolWidth + 'px';
		this.poolElem.style.height = height + 'px';

		this.PositionPoolElems(true);

		this.logicElem.style.left = logicLeft + 'px';
		this.logicElem.style.top = controlsTop + 'px';
		this.logicTop = controlsTop;
		mainWidth = logicLeft + logicWidth + 20;

		this.actionsElem.style.top = (controlsTop + height + 7) + 'px';
		this.actionsElem.style.left = Math.floor(mainWidth / 2 - this.actionsElem.offsetWidth / 2) + 'px';
		this.titleElem.style.left = Math.floor(mainWidth / 2 - this.titleElem.offsetWidth / 2) + 'px';
		height = controlsTop + height + actionsHeight + 10;
		this.winTop = Math.min(maxHeight - height, 150);
		this.width = mainWidth;
		this.dragger.minX = 5;
		this.dragger.minY = 5;
		this.dragger.topX = mainWidth;
		this.dragger.topY = height;
		this.dragger.owner = this;
		this.Show(this.onClose, mainWidth, height);
	}
	if (typeof (fvmCtl) != 'undefined')
	{
		fvmCtl.fvm.AddPlugin(flow.logic.ActionBlockDesigner, 'design', 'BlockDesigner');
	}
	else
		alert('ActionBlock Designer Plugins Loaded but no Macro Control object to bind to...');

} ());
