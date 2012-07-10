// Module Pattern for best performance and non-global vars
/// <reference path="../SCMacros.js" />
/// <reference path="../DynWin.js" />
/// <reference path="../ScreenInfo.js" />
/// <reference path="../MacDesign.js" />
/// <reference path="../FlowEdit.js" />
/// <reference path="../MacrosMgr.htm" />
/// <reference path="../Plugin.js" />
/// <reference path="ActionBlock.js" />
(function ()
{
	var tab = '  ', tab2 = tab + tab, tab3 = tab2 + tab, tab4 = tab3 + tab;
	var nmFix = function (text) { return text.replace(/ /g, '_'); };
	if (!flow.logic)
		flow.logic = {};

	//-------------------- Action Class ----------------------------
	flow.logic.Action = function (runtime, id, name, icon, view, title)
	{
		if (!runtime)
			return;
		this.runtime = runtime;
		this.id = id;
		this.name = name;
		this.icon = icon;
		this.title = title;
		this.view = view;
		this.live = true;      // for ease in I.D. compared to a reference/imitator
		this.container = null; // for type of container...
		this.varsMeta = [];
	}
	var ACPROT = flow.logic.Action.prototype;

	ACPROT.GetVarRefs = function (forGen)
	{
		return this.varsMeta;
	}

	ACPROT.toJSON = function ()
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

	ACPROT.SetContainer = function (container)
	{
		// If being dragged, remove from current container...
		if (!container && this.container && this.elem)
			this.container.RemoveAction(this.elem.id);
		this.container = container;
	}

	ACPROT.GetStartName = function ()
	{
		return nmFix(this.name);
	}

	ACPROT.HasDataLinks = function ()
	{
		return (this.linked);
	}

	// For actions that have an additional designer beyond the MVC settings
	ACPROT.GetDesigner = function (htDoc, parent)
	{
		return null;
	}

	// Caller inherits from Action
	flow.logic.Caller = function (runtime, name)
	{
		if (!name)
			name = 'CallWorker';
		flow.logic.Action.call(this, runtime, 'Caller', name, 'Caller', 'call',
								'Call a Procedure Block defined in the Work Container');
		this.needsMatch = this.hasToVar = this.hasToExt = true;
		this.ProcName = null;
		this.varLinked = false;
		this.extLinked = false;
	}
	flow.logic.Caller.prototype = new flow.logic.Action();
	var ACALLR = flow.logic.Caller.prototype; // convenience
	ACALLR.constructor = flow.logic.Caller;

	ACALLR.SetProcName = function (name)
	{
		this.ProcName = name;
	}

	ACALLR.GetProcName = function ()
	{
		return this.ProcName;
	}

	ACALLR.GenAction = function (nextAction)
	{
		if (!this.ProcName)
		{
			alert('Cannot Generate CallWorker "' + this.name + '" as there has been no Work Procedure linked to it');
			return '';
		}
		var t = flow.logic.GenActionHeader(this);
		t += tab3 + 'macro.CallBlock(\n';
		t += tab4 + '{"blockName": "' + nmFix(this.ProcName) + '",\n';
		t += tab4 + ' "returnAction": "' + nextAction + '",\n';
		t += tab4 + ' "vars": this.vars,\n';
		t += tab4 + ' "varsMeta": this.varsMeta\n';
		t += tab4 + '});\n';
		t += tab3 + 'return { "ok": true, "inCall": true };\n';
		t += tab2 + '}';
		return t;
	}

	// UIAction inherits from Action
	flow.logic.UIPrompt = function (runtime, name)
	{
		if (!name)
			name = 'UserInput';
		flow.logic.Action.call(this, runtime, 'UIPrompt', name, 'UIPAction', 'tovar',
								'User Input Prompt');
	}
	flow.logic.UIPrompt.prototype = new flow.logic.Action();
	var ACUIP = flow.logic.UIPrompt.prototype; // convenience
	ACUIP.constructor = flow.logic.UIAction;

	ACUIP.GenAction = function (nextAction)
	{
		var t = flow.logic.GenActionHeader(this);
		t += tab3 + 'var result=macro.GetMacParmValues();\n';
		t += flow.logic.GenActionFooter(true, nextAction, 'result.wait');
		return t;
	}

	// ScreenIOAction inherits from Action
	flow.logic.ScreenIOAction = function (runtime, name)
	{
		if (!name)
			name = 'ScreenIO';
		flow.logic.Action.call(this, runtime, 'ScreenIO', name, 'ScreenAction', 'middle', 'Screen Interactions');
		this.multiples = false; // only one per macro
		this.flowAlign = 'center';
	}
	flow.logic.ScreenIOAction.prototype = new flow.logic.Action();
	var ACSIO = flow.logic.ScreenIOAction.prototype; // convenience
	ACSIO.constructor = flow.logic.ScreenIOAction;

	ACSIO.GetVarRefs = function (type)
	{
		var i, screens = this.runtime.design.screens, varRefs = [],
			 forGen = (type == 'gen');
		for (i = 0; i < screens.length; i++)
		{
			varRefs.push.apply(varRefs, screens[i].GetVarRefs(forGen));
		}
		if (this.runtime.design.recVars)
		{
			for (i = 0; i < this.runtime.design.recVars.length; i++)
			{
				macVar = this.runtime.design.recVars[i];
				if (macVar.scnNumId ||
				    (!forGen && macVar.hideForMatch))
					continue; // already added by a screen or not a matchable field...
				varRefs.push(macVar);
			}
		}
		return varRefs;
	}

	ACSIO.GetRestartAction = function ()
	{
		if (this.runtime.design.wizGenRestart)
			return "ResetScreen";
		else
			return null;
	}

	ACSIO.GetStartLines = function (lines)
	{
		lines.push('macro.runtime.ClearScreenHistory();');
		true;
	}

	ACSIO.GenAction = function (nextAction)
	{
		var t = flow.logic.GenActionHeader(this), lines, restartLines = null,
			i, line, okFixed = false, waitExp = null;

		lines = this.runtime.design.screenIOCode;

		for (i = 0; i < lines.length; i++)
		{
			line = lines[i];
			if (line == '***ACTIONS***')
			{
				if (this.runtime.design.wizGenRestart)
					t += tab4 + 'macro.PushAction(\'ResetScreen\');\n';
				t += tab4 + flow.logic.GenActionReturn(true, nextAction);
				i++;
				for (; i < lines.length; i++)
				{
					line = flow.macs.trim(lines[i]);
					if ((line != 'break;') &&
						 (line != '***OK***'))
					{
						if (!restartLines)
							restartLines = [];
						restartLines.push(line);
					}
					else
					{
						if (line == 'break;')
							break;
					}
				}
			}
			else if (line == '***OK***')
			{
				if (this.runtime.design.wizGenRestart)
					t += tab4 + flow.logic.GenActionReturn(true);
				else				
					t += tab4 + flow.logic.GenActionReturn(true, nextAction);
			}
			else
				t += tab3 + line + '\n';
		}

		t += flow.logic.GenActionFooter(true, nmFix(this.name), 'true');
		if (this.runtime.design.wizGenRestart)
		{
			t += ',\n' + flow.logic.GenActionHeader(this, 'ResetScreen');
			if (restartLines)
			{
				t += tab3 + 'var scn=macro.scn\n';
				for (i = 0; i < restartLines.length; i++)
				{
					line = restartLines[i];
					if (line.indexOf('SendAidKey') != -1)
						waitExp = 'true';
					t += tab3 + line + '\n';
				}
			}
			t += flow.logic.GenActionFooter(true, nmFix(this.name), waitExp);
		}
		return t;
	}

	// PluginAction inherits from Action
	flow.logic.PluginAction = function (runtime, name, id)
	{
		if (!id)
			id = 'ExtExport', icon;
		this.extIsTarget = (id == 'ExtExport');
		if (this.extIsTarget)
		{
			icon = 'pluginexp';
			this.flowAlign = 'right';
		}
		else
		{
			icon = 'pluginimp';
			this.flowAlign = 'left';
		}

		flow.logic.Action.call(this, runtime, id,
								name, icon,
								(this.extIsTarget) ? 'toext' : 'tovar',
								(this.extIsTarget) ? 'Write to Plugin' : 'Read from Plugin');
		this.needsMatch = true;
		this.varLinked = false;
		this.extLinked = false;
		this.preExecGen = null;
		this.preExecName = null;
		this.designer = null;
		this.linked = false;
		this.plugin = null;
		this.pluginId = null;
		this.designInstanceId = -1;
	}
	flow.logic.PluginAction.prototype = new flow.logic.Action();
	var ACPLG = flow.logic.PluginAction.prototype; // convenience
	ACPLG.constructor = flow.logic.PluginAction;

	ACPLG.GetPlugin = function ()
	{
		return this.pluginId;
	}

	ACPLG.SetPlugin = function (pluginId)
	{
		var plugin;
		if (pluginId != this.pluginId)
		{
			this.pluginId = pluginId;
			this.designInstanceId = -1;
			this.plugin = null;
		}
		if (!this.plugin)
		{
			plugin = this.runtime.GetPlugin(pluginId);
			if (!plugin)
			{
				alert('Unable to Load Plugin with ID ' + pluginId + '!');
				return;
			}
			this.plugin = plugin;
		}
		if (this.plugin.GetIcon)
			this.icon = this.plugin.GetIcon(this.extIsTarget);
	}

	ACPLG.GetDesigner = function (htDoc, parent)
	{
		if (!this.plugin)
			this.SetPlugin(this.pluginId);
		this.designer = this.plugin.InitDesigner(htDoc, parent, this.designInstanceId, this.runtime.design, this.extIsTarget);
		this.designer.SetAction(this);
		if (this.designer.data.instanceId != this.designInstanceId)
		{
			//TODO Possibly do something here if this.designInstanceId != -1?, cleanup extra instance ext props?
			this.designInstanceId = this.designer.data.instanceId;
		}
		return this.designer;
	}

	ACPLG.GetStartName = function ()
	{
		var gen;
		if (this.preExecName)
			return this.preExecName;
		if (!this.plugin && !this.pluginId)
			return '// Plugin for action ' + this.name + ' not loaded and unknown (no ID)!!!!\n';
		if (!this.plugin)
			this.SetPlugin(this.pluginId);
		if (!this.designer)
		{
			this.GetDesigner(this.runtime.flowDoc, this.runtime.flowParent);
			this.runtime.design.AddActiveDesigner(this.designer);
		}
		gen = this.designer.GenCode('PreExec');
		if (gen)
		{
			this.preExecGen = gen;
			this.preExecName = nmFix(this.name) + '_Init';
			return this.preExecName;
		}
		return nmFix(this.name);
	}

	ACPLG.GenAction = function (nextAction)
	{
		var t = '', i, gen = this.preExecGen, lines,
			 fxdName = nmFix(this.name);
		if (gen)
		{
			t += flow.logic.GenActionHeader(this, this.preExecName);
			for (i = 0; i < gen.lines.length; i++)
			{
				t += tab3 + gen.lines[i] + '\n';
			}
			t += flow.logic.GenActionFooter(true, fxdName, gen.waitExp);
			t += ',\n';
		}
		gen = this.designer.GenCode('Exec');
		t += flow.logic.GenActionHeader(this, fxdName);
		for (i = 0; i < gen.lines.length; i++)
		{
			t += tab3 + gen.lines[i] + '\n';
		}
		t += flow.logic.GenActionFooter(true, nextAction, gen.waitExp);
		return t;
	}

	if (typeof (fvmCtl) != 'undefined')
	{
		/* Future Support for Callable Procedures
		fvmCtl.fvm.AddPlugin(flow.logic.Caller, 'logic', 'Caller', 'Caller', 'Call Work Procedure', true,
				{ 'e_name': 'CallName', 'e_Proc': 'Procname',
					'propNames':
					{
						'CallName':
						{
							'text': 'Name of the Call Worker Action',
							'defaultValue': 'Call Procedure',
							'title': 'This is the name that appears in the Logic diagram for this action.',
							'editFunc': function (text) { return flow.logic.BlanksEdit(text, this.text); }
						}
					},
					'Procname':
					{
						'text': 'Work Procedure name',
						'defaultValue': '',
						'constFunc': 'WorkProcSelect',
						'title': 'Select the Procedure from the defined Callable Procedures in the Work Logic definition.'
					}
				});
		*/
		fvmCtl.fvm.AddPlugin(flow.logic.UIPrompt, 'logic', 'UIPrompt', 'UIPAction', 'User Input Prompt', true,
				{ 'e_name': 'UIPromptName',
					'propNames':
					{
						'UIPromptName':
						{
							'text': 'Name of UIPrompt Logic Block',
							'defaultValue': 'User Prompt',
							'title': 'When the User Input Prompt Logic block is defined, this is the starting name.',
							'editFunc': function (text) { return flow.logic.BlanksEdit(text, this.text); }
						}
					}
				});
		fvmCtl.fvm.AddPlugin(flow.logic.ScreenIOAction, 'logic', 'ScreenIO', 'ScreenAction', 'Screen Interactions', true,
				{ 'e_name': 'ScreenIOName',
					'propNames':
					{
						'ScreenIOName':
						{
							'text': 'Name of the ScreenIO Logic Block',
							'defaultValue': 'Screen Macro Playback',
							'title': 'When the User ScreenIO Logic block is defined, this is the starting name.',
							'editFunc': function (text) { return flow.logic.BlanksEdit(text, this.text); }
						}
					}
				});
		fvmCtl.fvm.AddPlugin(flow.logic.PluginAction, 'logic', 'ExtImport', 'pluginimp', 'Read from Plugin', true,
				{ 'e_name': 'ExtImportName', 'e_Plugin': 'Plugin',
					'propNames':
					{
						'ExtImportName':
						{
							'text': 'Name of Plug-in Import Block',
							'defaultValue': 'Plugin Import',
							'title': 'Set the name of the block based on its functionality in the flow...',
							'editFunc': function (text) { return flow.logic.BlanksEdit(text, this.text); }
						},
						'Plugin':
						{
							'text': 'Import Plug-in',
							'defaultValue': 'xlsData',
							'constFunc': 'PluginImportSelect',
							'title': 'Select the Plug-in from available Import-capable Plug-ins that will provide the data to the active Macro Flow data tree.'
						}
					}
				});
		fvmCtl.fvm.AddPlugin(flow.logic.PluginAction, 'logic', 'ExtExport', 'pluginexp', 'Write to Plugin', true,
				{ 'e_name': 'ExtExportName', 'e_Plugin': 'Plugin',
					'propNames':
					{
						'ExtExportName':
						{
							'text': 'Name of Plug-in Export Block',
							'defaultValue': 'Plugin Export',
							'title': 'Set the name of the block based on its functionality in the flow...',
							'editFunc': function (text) { return flow.logic.BlanksEdit(text, this.text); }
						},
						'Plugin':
						{
							'text': 'Export Plug-in',
							'defaultValue': 'xlsData',
							'constFunc': 'PluginExportSelect',
							'title': 'Select the Plug-in from available Export-capable Plug-ins that will read data from the active Macro Flow data tree.'
						}
					}
				});
	}
	else
		alert('Plugin Loaded but no Macro Control object to bind to...');
} ());