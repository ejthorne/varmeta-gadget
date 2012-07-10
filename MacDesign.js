// Module Pattern for best performance and non-global vars
/// <reference path="SCMacros.js" />
/// <reference path="ScreenInfo.js" />
/// <reference path="Plugins/ActionBlock.js" />
(function ()
{
	flow.macs.fromJSON = function (json)
	{
		var clone = JSON.parse(json);
		var design = new flow.macs.MacDesign();
		design.FixupFromJSON(clone.recVars, clone.screens, clone.recKeys, clone.plugInData, clone.actionBlocks);
		return design;
	}

	flow.macs.MacDesign = function ()
	{
		this.initialized = false;
		this.macroWizState = "new";
		this.screenIndex = 0;
		this.screen = null;
		this.screens = [];
		this.recVars = [];
		this.newVars = [];
		this.JSON = JSON;
		this.plugInData = {};
		this.actionBlocks = {};
		this.activeDesigners = {};
		//this.recKeys not created: it is a flag for a new MacDesign...
	}
	var MDPROT = flow.macs.MacDesign.prototype; //convenience

	MDPROT.toJSON = function ()
	{
		return { "recVars": this.recVars,
			"screens": this.screens,
			"recKeys": this.recKeys,
			"plugInData": this.plugInData,
			"actionBlocks": this.actionBlocks
		};
	}

	// Returns the data of the requested actions (not real classes...will need to be renewed to be real)
	MDPROT.GetActionsData = function (blockName, idFilter)
	{
		var block, i, action, actions;
		if (this.actionBlocks[blockName])
		{
			block = this.actionBlocks[blockName];
			if (idFilter)
			{
				actions = [];
				for (i = 0; i < block.children.length; i++)
				{
					action = block.children[i];
					if (action.id == idFilter)
						actions.push(action);
				}
				return actions;
			}
			return block.children;
		}
		return null;
	}

	MDPROT.RegisterActionBlock = function (name)
	{
		var newData;

		if (!this.actionBlocks[name])
		{
			newData = {
				"design": {
					"children": [],
					"varsMeta": []
				}
			};
			this.actionBlocks[name] = newData;
		}
		return this.actionBlocks[name];
	}

	MDPROT.RegisterPluginDesigner = function (pluginKey, instanceId, extIsTarget, defaultFileType)
	{
		var newData, newDesigner = false,
			 insertAt, keyStart, keyEnd;
		if (instanceId == -1)
		{
			newDesigner = true;
			instanceId = 0;
			insertAt = pluginKey.indexOf('_');
			if (insertAt != -1)
			{
				keyStart = pluginKey.substring(0, insertAt);
				keyEnd = pluginKey.substring(insertAt);
			}
			else
			{
				keyStart = pluginKey;
				keyEnd = '';
			}
		}
		while (newDesigner && this.plugInData[pluginKey])
		{
			if (instanceId == 0)
				instanceId = 2;  // start at 2 after default...looks better in code
			else
				instanceId++;
			pluginKey = keyStart + '_' + instanceId + keyEnd;
		}

		if (!this.plugInData[pluginKey])
		{
			if (!defaultFileType)
				defaultFileType = 'PC';
			newData = {
				"instanceId": instanceId,
				"activeDoc": null,
				"validatedDoc": null,
				"IsMatched": false,
				"matchDoc": null,
				"promptForDoc": false,
				"templateText": '',
				"activeFileType": defaultFileType,
				"newVars": []
			};
			newData.toJSON = function ()
			{
				var key, clone = {},
					 data, varsClone, extsClone,
					 i, macVar, varClone, varProp;
				for (key in this)
				{
					switch (key)
					{
						case 'newVars':
							clone[key] = varsClone = [];
							for (i = 0; i < this.newVars.length; i++)
							{
								macVar = this.newVars[i];
								varClone = {};
								for (varProp in macVar)
								{
									switch (varProp)
									{
										case 'bindObj':
										case 'linkedTo':
											break; //TODO--possibly save an ID here...
										default:
											data = macVar[varProp];
											if (typeof (data) != 'function')
												varClone[varProp] = data;
											break;
									}
								}
								varsClone.push(varClone);
							}
							break;
						default:
							data = this[key];
							if (typeof (data) != 'function')
								clone[key] = data;
					}
				}
				return clone;
			};
			this.plugInData[pluginKey] = newData;
		}
		return this.plugInData[pluginKey];
	}

	MDPROT.FindScreenOrphans = function ()
	{
		var i, macVar, orphans = [];
		for (i = 0; i < this.recVars.length; i++)
		{
			macVar = this.recVars[i];
			if ((macVar.source == 'screen') &&
				 !macVar.scnNumId)
			{
				orphans.push(macVar);
			}
		}
		if (this.actionBlocks && this.actionBlocks.Main && this.actionBlocks.Main.children)
			this.FindActionsScreenOrphans(this.actionBlocks.Main.design.children, orphans);
		return orphans;
	}

	MDPROT.FindActionsScreenOrphans = function (actions, orphans)
	{
		var i, j, action, macVar;
		for (i = 0; i < actions.length; i++)
		{
			action = actions[i];
			for (j = 0; j < action.varsMeta.length; j++)
			{
				macVar = action.varsMeta[j];
				if ((macVar.source == 'screen') &&
						 !macVar.scnNumId)
				{
					orphans.push(macVar);
				}
				if (action.children)
					this.FindActionsScreenOrphans(action.children, orphans);
			}
		}
	}

	MDPROT.RemoveFieldByName = function (name)
	{
		var i;
		for (i = 0; i < this.recVars.length; i++)
		{
			if (this.recVars[i].name == name)
			{
				return this.recVars.splice(i, 1);
			}
		}
		if (this.actionBlocks && this.actionBlocks.Main && this.actionBlocks.Main.children)
			return this.RemoveActionsFieldByName(this.actionBlocks.Main.design.children, name);
	}

	MDPROT.RemoveActionsFieldByName = function (actions, name)
	{
		var i, j, action, cut = null;
		for (i = 0; i < actions.length; i++)
		{
			action = actions[i];
			for (j = 0; j < action.varsMeta.length; j++)
			{
				if (action.varsMeta[j].name == name)
					return action.varsMeta.splice(j, 1);

				if (action.children)
				{
					cut = this.RemoveActionsFieldByName(action.children, name);
					if (cut)
						return cut;
				}
			}
		}
		return null;
	}

	MDPROT.FindFieldByName = function (name)
	{
		var i;
		for (i = 0; i < this.recVars.length; i++)
		{
			if (this.recVars[i].name == name)
				return this.recVars[i];
		}
		return null;
	}

	MDPROT.FindScreenFromId = function (id, forScnType)
	{
		var s;
		for (s = 0; s < this.screens.length; s++)
		{
			if ((this.screens[s].id == id) &&
				 (!this.screens[s][forScnType]))
				return this.screens[s];
		}
		return null;
	}

	MDPROT.FixupFromJSON = function (recVars, screens, recKeys, plugInData, actionBlocks)
	{
		var i, ko, clone, screen, prop;
		this.recVars = recVars;
		for (i = 0; i < screens.length; i++)
		{
			clone = screens[i];
			var screen = new flow.macs.ScreenInfo();
			for (prop in clone)
				screen[prop] = clone[prop];
			screen.FixupFromJSON(this);
			this.screens.push(screen);
		}
		this.recKeys = new Array();
		for (i = 0; i < recKeys.length; i++)
		{
			ko = recKeys[i];
			switch (ko.type)
			{
				case 'fset':
					if (ko.key.fld.fref)
						ko.key.fld.fref = this.FindFieldByName(ko.key.fld.fref);
					break;
				case 'scnout':
					if (typeof (ko.refScn) != 'undefined')
					{
						if (typeof (ko.refScn) == 'string')
							ko.refScn = this.FindScreenFromId(ko.refScn, 'scnout');
						else
							ko.refScn = this.screens[ko.refScn];
						if (ko.refScn)
							ko.refScn.scnout = ko.key;
					}
					break;
				case 'scnin':
					if (typeof (ko.refScn) != 'undefined')
					{
						if (typeof (ko.refScn) == 'string')
							ko.refScn = this.FindScreenFromId(ko.refScn, 'scnin');
						else
							ko.refScn = this.screens[ko.refScn];
						if (ko.refScn)
							ko.refScn.scnin = ko;
					}
					break;
				default:
					//no action needed
					break;
			}
			this.AddRecKey(ko);
		}
		this.plugInData = plugInData;
		this.actionBlocks = actionBlocks;  //actions are renewed as they are initialized in a block
	}

	MDPROT.AddRecKey = function (recKey)
	{
		var fld, refScn, clone, prop,
			 me = this;
		switch (recKey.type)
		{
			case 'fset':
				fld = recKey.key.fld;
				if (fld.fref)
				{
					fld.toJSON = function (key)
					{
						clone = {};
						for (prop in this)
						{
							clone[prop] = (prop != 'fref') ? this[prop] : this.fref.name;
						}
						return clone;
					};
				}
				break;
			case 'scnout':
			case 'scnin':
				if (recKey.refScn)
				{
					recKey.toJSON = function (key)
					{
						clone = {};
						for (prop in this)
						{
							clone[prop] = (prop != 'refScn') ? this[prop] : this.refScn.index;
						}
						return clone;
					};
				}
				break;
			case 'aid':
				//clean...
				break;
			default:
				recKey.toJSON = function (key)
				{
					return { 'NotDoneType': this.type };
				}
				break;
		}
		this.recKeys.push(recKey);
	}

	MDPROT.GetScreen = function (index)
	{
		if ((index < 0) ||
	    (index >= this.screens.length))
			return null;
		return this.screens[index];
	}

	MDPROT.PrevScreen = function ()
	{
		if (this.screenIndex > 0)
			return this.SetActiveScreen(this.screenIndex - 1);

		return null;
	}

	MDPROT.NextScreen = function ()
	{
		if (this.screenIndex < this.screens.length)
			return this.SetActiveScreen(this.screenIndex + 1);

		return null;
	}

	MDPROT.SetActiveScreen = function (index)
	{
		this.screenIndex = index;
		if (this.screenIndex < this.screens.length)
			this.screen = this.screens[this.screenIndex];
		else
			this.screen = null;
		return this.screen;
	}

	MDPROT.AtOptions = function ()
	{
		return (this.screenIndex == this.screens.length);
	}

	MDPROT.GetDesignerConstructors = function ()
	{
		var commented = false, designerKey, designer,
		 code = null, e, lines = [];
		for (designerKey in this.activeDesigners)
		{
			designer = this.activeDesigners[designerKey];
			if (designer.GetConstructorCode)
			{
				alert('Designer ' + designer.name + ' has obsolete code generation!');
			}
			else if (designer.GenCode)
			{
				code = designer.GenCode('Init');
			}
			if (!code || !code.lines || (code.lines.length == 0))
				continue;
			if (lines.length > 0)
				lines.push('');
			lines.push('// ' + designer.title + ' Initialization...');
			lines.push.apply(lines, code.lines);
		}
		if (lines.length == 0)
			return null;
		return lines;
	}

	MDPROT.AddActiveDesigner = function (designer)
	{
		this.activeDesigners[designer.GetKey()] = designer;
	}

	MDPROT.PluginUpdate = function (designer)
	{
		var s, scn, matchedReads, r, read, found, r2,
			 newField, propName, prop;
		this.AddActiveDesigner(designer);
		for (s = 0; s < this.screens.length; s++)
		{
			scn = this.screens[s];
			matchedReads = scn.GetMatchedReads();
			if (matchedReads)
			{
				for (r = 0; r < matchedReads.length; r++)
				{
					read = matchedReads[r];
					found = false;
					for (r2 = 0; r2 < this.recVars.length; r2++)
					{
						if (this.recVars[r2].name == read.name)
						{
							found = true;
							break;
						}
					}
					if (found)
						continue;
					newField = { 'val': read.text, 'type': 'read', 'source': 'screen' };
					for (propName in read)
					{
						prop = read[propName];
						switch (propName)
						{
							case 'row':
							case 'col':
							case 'len':
							case 'text':
							case 'linked':
							case 'id':
								break;
							default:
								newField[propName] = prop;
								break;
						}
					}
					this.recVars.push(newField);
				}
			}
			if (scn.role == 'finish')
			{
				scn.extActions = '***ACTIONS***';
			}
			else
				scn.extActions = null;
		}
	}

} ());

