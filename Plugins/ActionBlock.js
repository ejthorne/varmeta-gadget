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
	if (!flow.logic)
		flow.logic = {};
	var tab = '  ', tab2 = tab + tab, tab3 = tab2 + tab, tab4 = tab3 + tab;
	var nmFix = function (text) { return text.replace(/ /g, '_'); };

	flow.logic.okJSON = '*children*varsMeta*topMeta*';
	flow.logic.GenActionHeader = function (action, name)
	{
		var t;
		if (!name)
			name = action.GetStartName();
		t = tab + '"' + name + '":\n';
		t += tab2 + 'function()\n';
		t += tab2 + '{\n';
		return t;
	}

	flow.logic.PushUnique = function (ar1, obj)
	{
		var i, name = obj.name;
		for (i = 0; i < ar1.length; i++)
		{
			if (ar1[i].name == name)
				return;
		}
		ar1.push(obj);
	}

	flow.logic.CopyUnique = function (ar1, ar2)
	{
		var i;
		for (i = 0; i < ar2.length; i++)
		{
			flow.logic.PushUnique(ar1, ar2[i]);
		}
	}

	flow.logic.GenActionFooter = function (ok, nextAction, waitExp)
	{
		var t = tab3 + flow.logic.GenActionReturn(ok, nextAction, waitExp);
		t += tab2 + '}';
		return t;
	}

	flow.logic.GenActionReturn = function (ok, nextAction, waitExp)
	{
		var t = 'return {"ok":' + ((ok) ? 'true' : 'false');
		if (nextAction)
			t += ', "next":"' + nextAction + '"';

		if (waitExp)
			t += ', "wait":' + waitExp;
		t += '};\n';
		return t;
	}

	// Generate the blocks in the provided object, using order, which is an array of block id's
	flow.logic.GenBlocks = function (actionBlocks)
	{
		var block, i, t = 'this.Logic={\n';
		if (!actionBlocks ||
			 (actionBlocks.length == 0))
		{
			alert('flow.logic.GenBlocks: No ActionBlocks or length is zero of the ActionBlocks array...');
			return '';
		}
		t += '"StartBlock":"' + nmFix(actionBlocks[0].name) + '",\n';
		for (i = 0; i < actionBlocks.length; i++)
		{
			block = actionBlocks[i];
			if (block.children.length == 0)
				continue;
			t += block.GenBlock();  // can have sequenced blocks with nextBlock parm, but not currently implemented
		}
		t += ' } // End of Logic Singleton Object\n';
		return t;
	}

	//-------------------- ActionBlock Class ----------------------------
	flow.logic.ActionBlock = function (runtime, name)
	{
		this.runtime = runtime;
		this.name = name;
		this.elem = null;
		this.filters = null;
		this.initOnRestart = false;
		this.children = [];
		this.varsMeta = [];
		this.topMeta = null;
		this.varMetaName = null;
		this.designInstanceId = -1;
		this.extIsTarget = false;
		this.AddFilter('Callable', false);
	}
	var ABPROT = flow.logic.ActionBlock.prototype;

	ABPROT.GetVarMetaName = function (name)
	{
		return nmFix(name) + 'Vars';
	}

	ABPROT.GetVarMeta = function ()
	{
		return this.topMeta;
	}

	ABPROT.SetName = function (text)
	{
		var newVarMetaName = this.GetVarMetaName(text);
		if (this.topMeta)
		{
			if (this.topMeta.name != newVarMetaName)
				this.topMeta.name = newVarMetaName;
		}
		else
			this.topMeta = { "name": newVarMetaName, "children": [], "hideForMatch": true };
		this.varMetaName = newVarMetaName;
		this.name = text;
	}

	// type='gen' 'match' 'top'
	ABPROT.GetVarRefs = function (type, arrayOnly)
	{
		var varsMeta = [], i, j, varRef = null, varMeta = null,
			 varRefs = varsMeta,
			 forGen = (type == 'gen'),
			 pushin = (this.container && (forGen || (type == 'linkin'))),
			 drillDown = (forGen || ((type == 'match') || (type == 'linkin'))),
			 drillType = (forGen) ? 'gen' : 'top',
			 childRefs;

		if (drillDown)
		{
			if (!this.topMeta)
				this.topMeta = { "name": this.varMetaName, "children": [], "hideForMatch": true };
			if (pushin)
			{
				varMeta = this.topMeta;
				varMeta.children = [];
				varRefs.push(varMeta);
				varRefs = varMeta.children;
			}
			for (i = 0; i < this.children.length; i++)
			{
				childRefs = this.children[i].GetVarRefs(drillType);
				if (arrayOnly)
				{
					for (j = 0; j < childRefs.length; j++)
					{
						if (childRefs[j].hasChildren)
							flow.logic.PushUnique(varRefs, childRefs[j]);
					}
				}
				else
					flow.logic.CopyUnique(varRefs, childRefs);
			}
		}

		for (i = 0; i < this.varsMeta.length; i++)
		{
			varMeta = this.varsMeta[i];
			if (forGen || !varMeta.hideForMatch)
				flow.logic.PushUnique(varRefs, varMeta);
		}
		return varsMeta;
	}

	ABPROT.toJSON = function ()
	{
		var key, clone = {}, data;

		for (key in this)
		{
			data = this[key];
			if (typeof (data) == 'object')
			{
				if (flow.logic.okJSON.indexOf('*' + key + '*') == -1)
					continue;
			}
			else if (typeof (data) == 'function')
				continue;
			clone[key] = data;
		}
		return clone;
	};

	ABPROT.GetDesigner = function (htDoc, parent)
	{
		if (!this.extTypeList)
			return null;

		if (!this.designer ||
			 (this.designer.extIsTarget != this.extIsTarget) ||
			 (this.designer.instanceId != this.designInstanceId))
			this.designer = new flow.logic.ActStubDesigner(this, htDoc, parent, this.designInstanceId, this.runtime.design, this.extIsTarget);

		this.designer.SetAction(this);
		if (this.designer.data.instanceId != this.designInstanceId)
		{
			//TODO Possibly do something here if this.designInstanceId != -1?, cleanup extra instance ext props?
			this.designInstanceId = this.designer.data.instanceId;
		}
		return this.designer;
	}

	ABPROT.RestoreAction = function ()
	{
		if (this.savedActionIndex != -1)
		{
			this.InsertAction(this.savedAction, this.savedActionIndex);
			this.savedActionIndex = -1;
		}
	}

	ABPROT.RemoveAction = function (elemId)
	{
		var i;
		for (i = 0; i < this.children.length; i++)
		{
			if (this.children[i].elem &&
				 (this.children[i].elem.id == elemId))
			{
				this.savedActionIndex = i;
				this.savedAction = this.children[i];
				this.children.splice(i, 1);
				return;
			}
		}
		alert('ActionBlock.RemoveAction failed, Element ID "' + elemId + '" Not Found!');
	}

	ABPROT.InsertAction = function (action, insertAt)
	{
		action.SetContainer(this);
		if (typeof (insertAt) == 'number')
			this.children.splice(insertAt, 0, action);
		else
			this.children.push(action);
	}

	ABPROT.AddAction = function (id, name, insertAt)
	{
		var actionDef, actionId, propId, prop,
			 action, extraProperties = false, i;
		if (typeof (id) == 'object')
		{
			actionId = id.id;
			name = id.name;
			extraProperties = true;
		}
		else
			actionId = id;
		actionDef = this.runtime.GetAction(actionId);
		if (!name)
			name = "Action" + (this.children.length + 1);
		action = new actionDef.newFunc(this.runtime, name, actionId);
		this.InsertAction(action, insertAt);

		if (extraProperties)
		{
			for (propId in id)
			{
				if (action['Set' + propId])
					action['Set' + propId](id[propId]);
			}
		}
		if (id.newActions)
		{
			for (i = 0; i < id.newActions.length; i++)
				action.AddAction(id.newActions[i]);
		}
		return action;
	}

	ABPROT.GetDesign = function (design)
	{
		var i,
			 data = design.RegisterActionBlock(this.name),
			 actions = data.design.children;

		this.varsMeta = data.design.varsMeta;
		this.designInstanceId = (data.design.designInstanceId) ? data.design.designInstanceId : -1;
		this.design = design;
		this.designData = data;
		for (i = 0; i < actions.length; i++)
		{
			this.RenewAction(actions[i]);
		}
	}

	ABPROT.RenewAction = function (actionData)
	{
		var action = this.AddAction(actionData.id, actionData.name),
			 prop, i, children;
		for (prop in actionData)
		{
			if (prop == 'children')
			{
				// action is actually an ActionBlock...
				children = actionData.children;
				for (i = 0; i < children.length; i++)
				{
					action.RenewAction(children[i]);
				}
			}
			else
				action[prop] = actionData[prop];
		}
	}

	ABPROT.SaveDesign = function (design)
	{
		var json;
		if (!this.designData)
			this.designData = design.RegisterActionBlock(this.name)
		json = design.JSON.stringify(this)
		this.designData.design = design.JSON.parse(json);
	}


	ABPROT.AddStartLine = function (line)
	{
		if (!this.startLines)
			this.startLines = [];
		this.startLines.push(line);
	}

	ABPROT.GenBlock = function (nextBlock)
	{
		var t = '"' + this.name + '":\n{\n',
			i, action, nextText, startLines = [];
		t += tab + '"Start":\n';
		t += tab2 + 'function()\n';
		t += tab2 + '{\n';
		t += tab3 + '// Runtime initializes this.macro, this.vars and this.varsMeta\n';
		for (i = 0; i < this.children.length; i++)
		{
			action = this.children[i];
			if (action.GetStartLines)
				action.GetStartLines(startLines);
		}
		for (i = 0; i < startLines.length; i++)
		{
			t += tab3 + startLines[i] + '\n';
		}
		if (nextBlock)
			t += tab3 + 'this.nextBlock = "' + nextBlock + '";\n';
		if (this.children.length > 0)
			nextText = ', "next":"' + this.children[0].GetStartName() + '"';
		else
			nextText = '';
		t += tab3 + 'return {"ok":true' + nextText + '};\n';
		t += tab2 + '}';
		for (i = 0; i < this.children.length; i++)
		{
			action = this.children[i];
			t += ',\n';
			t += action.GenAction((i + 1 < this.children.length) ? this.children[i + 1].GetStartName() : null);
		}
		t += '\n}';
		return t;
	}

	ABPROT.CheckActionOK = function (actionType)
	{
		var filters = this.filters;
		if (!filters)
			return true;
		if (filters.include &&
			 filters.include[actionType])
			return true;
		if (filters.omit &&
			 filters.omit[actionType])
			return false;
		if (!filters.include)
			return true;
		else
			return false;
	}

	ABPROT.GetListFilters = function ()
	{
		return this.filters;
	}

	ABPROT.AddFilter = function (actionType, include)
	{
		if (!this.filters)
			this.filters = {};
		if (include)
		{
			if (!this.filters.include)
				this.filters.include = {};
			this.filters.include[actionType] = true;
		}
		else
		{
			if (!this.filters.omit)
				this.filters.omit = {};
			this.filters.omit[actionType] = true;
		}
	}

	// WorkBlock inherits from Block and only contains Callable Container actions
	flow.logic.WorkBlock = function (runtime, name)
	{
		if (!runtime)
			return;
		flow.logic.ActionBlock.call(this, runtime, name);
		this.view = 'container';
		this.inline = false;
		this.AddFilter('Callable', true);
	}
	flow.logic.WorkBlock.prototype = new flow.logic.ActionBlock();
	var ABWORK = flow.logic.WorkBlock.prototype; // convenience
	ABWORK.constructor = flow.logic.WorkBlock;

	ABWORK.GetListFilters = function ()
	{
		return null;
	}

	ABWORK.GenBlock = function ()
	{
		var t = '', i;
		for (i = 0; i < this.children.length; i++)
		{
			action = this.children[i];
			t += ',\n';
			t += action.GenBlock();
		}
		t += '\n}';
		return t;
	}

	// BlockContainer inherits from Block and Impersonates Action
	flow.logic.BlockContainer = function (runtime, name, id, icon, title)
	{
		if (!runtime)
			return;
		flow.logic.ActionBlock.call(this, runtime, name);
		this.id = id;
		this.icon = icon;
		this.title = title;
		this.view = 'container';
		this.inline = true;
		this.children = [];
		this.flowAlign = 'center';
	}
	flow.logic.BlockContainer.prototype = new flow.logic.ActionBlock();
	var ABCONT = flow.logic.BlockContainer.prototype; // convenience
	ABCONT.constructor = flow.logic.BlockContainer;

	ABCONT.SetContainer = function (container)
	{
		// If being dragged, remove from current container...
		if (!container && this.container && this.elem)
			this.container.RemoveAction(this.elem.id);
		this.container = container;
		if (container)
			this.SetName(this.name); // Creates Container varMeta if doesn't exist...
	}

	// A BlockContainer can either generate as full block or as a set of actions
	ABCONT.GenChildren = function (nextAction)
	{
		var i, action, t = '';
		for (i = 0; i < this.children.length; i++)
		{
			action = this.children[i];
			t += ',\n';
			t += action.GenAction((i + 1 < this.children.length) ? this.children[i + 1].GetStartName() : null);
		}
		return t;
	}

	// CallableBlock inherits from BlockContainer and Impersonates Action
	flow.logic.Callable = function (runtime, name)
	{
		if (!runtime)
			return;
		flow.logic.BlockContainer.call(this, runtime, name, 'Callable', 'ActionContainer', 'Callable Procedure');
		this.inline = false;
	}
	flow.logic.Callable.prototype = new flow.logic.BlockContainer();
	var ABCALL = flow.logic.Callable.prototype; // convenience
	ABCALL.constructor = flow.logic.Callable;

	flow.logic.IteratorTypeList =
	{
		'dataEnum':
		{
			'text': 'Iterate Data Array',
			'title': 'Using a array-type Macro variable, will loop through the elements from the start value to the end.',
			'hasChildren': false,
			'propNames':
				{
					'StartValue':
					{
						'text': 'Start Index',
						'defaultValue': '0',
						'title': 'Starting iterator value for looping through the values in the macro array-type variable.',
						'editRegex': /\d{1,5}/
					},
					'EndTest':
					{
						'text': 'Ending Expression',
						'defaultValue': '{{Iterator}} >= {{ArrayLength}}',
						'title': 'Test to determine the when the loop/iteration should end...as a Mustache Template, requires {{Iterator}} and {{ArrayLength}} template tokens.',
						'editFunc':
						function (text)
						{
							return ((text.indexOf('{{Iterator}}') != -1) && (text.indexOf('{{ArrayLength}}') != -1));
						}
					},
					'IterChange':
					{
						'text': 'Iterator Change',
						'defaultValue': '{{Iterator}}++',
						'title': 'Change expression for the iterator at the bottom of the loop...requires {{Iterator}} template tokens.',
						'editFunc':
						function (text)
						{
							return (text.indexOf('{{Iterator}}') != -1);
						}
					}
				}
		}
	}

	// ActionIterator inherits from BlockContainer and Impersonates Action
	flow.logic.DataIterator = function (runtime, name)
	{
		if (!runtime)
			return;
		if (!name)
			name = 'DataLoop';
		flow.logic.BlockContainer.call(this, runtime, name, 'Iterator', 'IteratorAction', 'Data Iterator');
		this.iteratorStartValue = 0;
		this.iteratorEndTest = '{{Iterator}} >= {{ArrayLength}}';
		this.iterChange = '{{Iterator}}++';
		this.iterContext = '{{VarReference}}[{{Iterator}}]';
		this.macVarName = null;
		this.needsMatch = true;
		this.extPropName = 'ext$DtIter';
		this.extType = 'dataEnum';
		this.extTypeList = flow.logic.IteratorTypeList;
	}
	flow.logic.DataIterator.prototype = new flow.logic.BlockContainer();
	var ABITER = flow.logic.DataIterator.prototype; // convenience
	ABITER.constructor = flow.logic.DataIterator;

	ABITER.SetStartValue = function (val)
	{
		this.iteratorStartValue = val;
	}

	ABITER.GetStartValue = function ()
	{
		return this.iteratorStartValue;
	}

	ABITER.SetEndTest = function (val)
	{
		this.iteratorEndTest = val;
	}

	ABITER.GetEndTest = function ()
	{
		return this.iteratorEndTest;
	}

	ABITER.SetIterChange = function (val)
	{
		this.iterChange = val;
	}

	ABITER.GetIterChange = function ()
	{
		return this.iterChange;
	}

	ABITER.GetMatchVarRefs = function ()
	{
		return this.GetVarRefs('linkin', false);
	}

	ABITER.GetMatchExtDefs = function ()
	{
		var varRefs = this.container.GetVarRefs('match', true),
			 i, varRef, j, childRef, extDefs = [], extDef;
		for (i = 0; i < varRefs.length; i++)
		{
			varRef = varRefs[i];
			if (varRef.children)
			{
				extDef = { 'name': varRef.name, 'nameType': 'Array', 'children': [], 'ext$Props': { 'name': varRef.name, 'hasChildren': true} };
				extDefs.push(extDef);
				for (j = 0; j < varRef.children.length; j++)
				{
					childRef = varRef.children[j];
					extDef.children.push({ 'name': childRef.name, 'nameType': 'Token', 'ext$Props': { 'name': childRef.name} });
				}
			}
		}
		return extDefs;
	}

	ABITER.HasDataLinks = function ()
	{
		return (this.macVarName != null);
	}

	ABITER.GetStartName = function ()
	{
		var varMeta = this.GetVarMeta(),
			 extObj;
		this.macVarName = null;
		if (varMeta)
		{
			extObj = varMeta[this.extPropName];
			if (extObj)
				this.macVarName = extObj.name;
		}
		if (this.macVarName == null)
			alert('Data Loop "' + this.name + '" needs to be matched to an input Array-style Variable...generation invalid without Match');
		return nmFix(this.name) + 'Start';
	}

	ABITER.GenAction = function (nextAction)
	{
		if (this.children.length == 0)
		{
			alert('Iterator Action named "' + this.name + '" has no actions defined...not generated...');
			return '';
		}
		var t = flow.logic.GenActionHeader(this), fxdName = nmFix(this.name),
			 i, varRef = 'this.' + fxdName + '_Arr', text, view,
			 firstChildName = nmFix(this.children[0].name);
		t += tab3 + varRef + ' = this.vars.' + this.macVarName + ';\n';
		t += tab3 + 'this.' + fxdName + '_vars = this.vars;\n';
		t += tab3 + 'this.' + fxdName + '_varsMeta = this.varsMeta;\n';
		t += tab3 + 'this.varsMeta = this.varsMeta.' + this.varMetaName + '.varsMeta;\n';
		t += tab3 + 'this.iterator = ' + this.iteratorStartValue + ';\n';
		t += flow.logic.GenActionFooter(true, fxdName + 'Test');
		t += ',\n';
		//Start -> Test
		t += flow.logic.GenActionHeader(this, fxdName + 'Test');
		t += tab3 + 'if (!' + varRef + ')\n';
		t += tab4 + flow.logic.GenActionReturn(true, nextAction);
		t += '\n';
		view = { "Iterator": 'this.iterator', "VarReference": varRef, "ArrayLength": varRef + '.length' };
		text = Mustache.render(this.iteratorEndTest, view);
		t += tab3 + 'if (' + text + ')\n';
		t += tab3 + '{\n';
		t += tab4 + 'this.vars = this.' + fxdName + '_vars;\n';
		t += tab4 + 'this.varsMeta = this.' + fxdName + '_varsMeta;\n';
		t += tab4 + flow.logic.GenActionReturn(true, nextAction);
		t += tab3 + '}\n';
		t += flow.logic.GenActionFooter(true, fxdName + 'SetContext');
		t += ',\n';
		//Test->SetContext
		t += flow.logic.GenActionHeader(this, fxdName + 'SetContext');
		text = Mustache.render(this.iterContext, view);
		t += tab3 + 'macro.SetVars(' + text + ',\'' + this.extPropName + '\');\n';
		t += tab3 + 'macro.PushAction(\'' + fxdName + 'Next\');\n';
		t += flow.logic.GenActionFooter(true, firstChildName);
		//SetContext->Children
		t += this.GenChildren();
		t += ',\n';
		//Children - >Next
		t += flow.logic.GenActionHeader(this, fxdName + 'Next');
		text = Mustache.render(this.iterChange, view);
		t += tab3 + text + ';\n';
		t += flow.logic.GenActionFooter(true, fxdName + 'Test');
		return t;
	}

	// UserIterator inherits from BlockContainer and Impersonates Action
	flow.logic.UserIterator = function (runtime, name)
	{
		if (!runtime)
			return;
		if (!name)
			name = 'UserLoop';
		flow.logic.BlockContainer.call(this, runtime, name, 'UserLoop', 'IteratorUser', 'User Prompted Loop');
		this.uiPrompt = this.AddAction('UIPrompt');
		this.uiPrompt.immutable = true;
	}
	flow.logic.UserIterator.prototype = new flow.logic.BlockContainer();
	var ABULOOP = flow.logic.UserIterator.prototype; // convenience
	ABULOOP.constructor = flow.logic.UserIterator;

	ABULOOP.AddAction = function (id, name, insertAt)
	{
		if ((typeof (id) == 'object') &&
			 (id.id == 'UIPrompt'))
		{
			this.uiPrompt.name = id.name;
			return this.uiPrompt;
		}
		else
			return ABCONT.AddAction.call(this, id, name, insertAt);
	}

	ABULOOP.GetStartName = function ()
	{
		return nmFix(this.name) + '_Init';
	}

	ABULOOP.GenAction = function (nextAction)
	{
		if (this.children.length < 2)
		{
			alert('User Loop Action named "' + this.name + '" has no actions defined besides User Prompt...not generated...');
			return '';
		}
		var t = flow.logic.GenActionHeader(this),
			 fxdName = nmFix(this.name),
			 i, firstChildName = nmFix(this.children[0].name);

		t += tab3 + 'this.varsMeta = this.varsMeta.'+fxdName+'Vars.varsMeta;\n';
		t += flow.logic.GenActionFooter(true, fxdName);
		t += ',\n';
		//Init -> Main
		t += flow.logic.GenActionHeader(this, fxdName);
		t += tab3 + 'macro.PushAction(\'' + fxdName + '\');\n';
		t += tab3 + 'macro.RestartInput(this);\n';
		t += flow.logic.GenActionFooter(true, firstChildName);
		//TopAction->Children
		t += this.GenChildren();
		return t;
	}

	if (typeof (fvmCtl) != 'undefined')
	{
		fvmCtl.fvm.AddPlugin(flow.logic.ActionBlock, 'logic', 'MainBlock', 'ActionContainer', 'Main Action Block', false);
		fvmCtl.fvm.AddPlugin(flow.logic.WorkBlock, 'logic', 'WorkBlock', 'ActionContainer', 'Workers Action Block', false);
		fvmCtl.fvm.AddPlugin(flow.logic.Callable, 'logic', 'Callable', 'ActionContainer', 'Callable Procedure', true,
				{ 'e_name': 'ProcName',
					'propNames':
					{
						'ProcName':
						{
							'text': 'Name of Callable Procedure',
							'defaultValue': 'Procedure',
							'title': 'This is the procedure name is displayed in the Work Editor graphic as well as what is used to call the procedure.',
							'editFunc': function (text) { return flow.logic.BlanksEdit(text, this.text); }
						}
					}
				});
		fvmCtl.fvm.AddPlugin(flow.logic.UserIterator, 'logic', 'UserLoop', 'IteratorUser', 'User Prompted Loop', true,
				{ 'e_name': 'UILoopName', 'newActions': ['UIPrompt'],
					'propNames':
					{
						'UILoopName':
						{
							'text': 'Name of UIPrompt Loop',
							'defaultValue': 'Top Level Loop',
							'title': 'When the User Input Prompted Loop block is defined, this is the starting name.',
							'editFunc': function (text) { return flow.logic.BlanksEdit(text, this.text); }
						}
					}
				});
		fvmCtl.fvm.AddPlugin(flow.logic.DataIterator, 'logic', 'Iterator', 'IteratorAction', 'Data Iterator', true,
				{ 'e_name': 'DataLoopName',
					'propNames':
					{
						'DataLoopName':
						{
							'text': 'Name of Data Loop',
							'defaultValue': 'Top Level Loop',
							'title': 'When the Data Loop block is defined, this is the starting name.',
							'editFunc': function (text) { return flow.logic.BlanksEdit(text, this.text); }
						}
					}
				});
	}
	else
		alert('Action Container Logic Plugins Loaded but no Macro Control object to bind to...');

} ());
