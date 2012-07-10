// Module Pattern for best performance and non-global vars
(function ()
{
	//-------------------- FlowMacro Runtime Class ----------------------------
	flow.macs.FlowMacro = function (runtime)
	{
		if (!runtime)
			return;
		this.runtime = runtime;
		this.plugins = runtime.plugins;
		this.stack = [];
		this.initialized = false;
		this.nextAction = null;
	}
	var FMPROT = flow.macs.FlowMacro.prototype; //convenience

	FMPROT.InitBlock = function (block, vars, varsMeta)
	{
		block.flow = this;
		block.vars = vars;
		block.varsMeta = varsMeta;
		block.returnActions = [];
	}

	FMPROT.PushAction = function (action)
	{
		this.Logic[this.activeBlock].returnActions.push(action);
	}

	FMPROT.RestartInput = function (activeBlockObj)
	{
		activeBlockObj.parms$Ready = false;
		this.runtime.ClearScreenHistory();
	}

	FMPROT.SetVars = function (fromRow, extPropName)
	{
		var id, activeBlockObj = this.Logic[this.activeBlock],
			 varsMeta = activeBlockObj.varsMeta,
			 toRow = {},
			 prop;

		this.RestartInput(activeBlockObj);
		for (id in varsMeta)
		{
			prop = varsMeta[id];
			if (prop[extPropName])
				toRow[id] = fromRow[prop[extPropName].name];
			else if (typeof (prop.val) != 'undefined')
				toRow[id] = prop.val;
		}
		activeBlockObj.vars = toRow;
	}

	FMPROT.LoadFromUI = function (activeBlockObj)
	{
		var varsMeta = this.runtime.macroParms.varsMeta,
			 vars = activeBlockObj.vars;
		if (!vars)
			activeBlockObj.vars = vars = {};
		for (id in varsMeta)
		{
			vars[id] = varsMeta[id].val;
		}
		activeBlockObj.parms$Ready = true;
		this.runtime.macroParms = null;
		return vars;
	}

	FMPROT.GetMacParmValues = function (initOnly)
	{
		var id, prompt, activeBlockObj = this.Logic[this.activeBlock],
			 varsMeta = activeBlockObj.varsMeta, vars = activeBlockObj.vars, val;

		if (activeBlockObj.parms$Ready)
			return { "wait": false };

		if (!vars)
			vars = activeBlockObj.vars = {};

		if (this.runtime.macroParms) // need copy
		{
			vars = this.LoadFromUI(activeBlockObj);
			if (initOnly)
				return vars;
			else
				return { "wait": false };
		}

		if (!varsMeta)
			varsMeta = this.runtime.ParameterInfo;
		if (varsMeta.varsMeta)
			this.runtime.macroParms = varsMeta;
		else
			this.runtime.macroParms = { "legend": this.runtime.ParameterInfo.legend, "varsMeta": varsMeta };
		if (initOnly)
		{
			if (!vars)
				vars = {};
			varsMeta = this.runtime.macroParms.varsMeta;
			for (id in varsMeta)
			{
				val = varsMeta[id].val;
				if (typeof (val) != 'undefined')
					vars[id] = val;
			}
			this.runtime.macroParms = null;
			return vars;
		}

		if (this.runtime.macroParms)
		{
			if (vars)
			{
				varsMeta = this.runtime.macroParms.varsMeta;
				for (id in vars)
				{
					if (varsMeta[id])
						varsMeta[id].val = vars[id];
				}
			}
			if (this.runtime.fvmCtl)
				this.runtime.fvmCtl.ShowWinPage(flow.macs.macUri+'MacroParms.htm');
			else
				throw new Error('No FV Macro Control object found to run macro!!');
			return { "wait": true };
		}
		else
		{
			activeBlockObj.parms$Ready = true;
			for (id in this.runtime.macroParms)
			{
				vars[id] = this.runtime.macroParms[id].val;
			}
			this.runtime.macroParms = null;
			return { "wait": false };
		}

		throw new Error('No ParameterInfo defined--do not call GetMacParmValues without ParameterInfo being defined...');
	}

	FMPROT.Run = function (vars, varsMeta)
	{
		var ret = null, activeBlockObj;
		if (!this.activeBlock || !this.nextAction)
		{
			if (!this.initialized)
			{
				this.activeBlock = this.Logic.StartBlock;
				this.nextAction = "Start";
			}
			else
			{
				this.runtime.EndMacro("During FlowMacro.Run, end of logic occurred prior to interpreter startup...");
				return false;
			}
		}
		if (this.runtime.macroParms) // need copy
			this.LoadFromUI(this.Logic[this.activeBlock]);
		while (true)
		{
			activeBlockObj = this.Logic[this.activeBlock];
			if (this.nextAction == "Start")
			{
				if (!vars)
					vars = this.GetMacParmValues(true);

				this.InitBlock(activeBlockObj, vars,
									(varsMeta) ? varsMeta : this.runtime.ParameterInfo.varsMeta);
				ret = activeBlockObj.Start(this);
			}
			else
				ret = activeBlockObj[this.nextAction](this);

			if (!ret.ok)
			{
				this.runtime.EndMacro(ret.message);
				return false;
			}
			else
			{
				if (ret.next)
					this.nextAction = ret.next;
				else if (ret.inCall)
					return true;
				else if (activeBlockObj.returnActions.length > 0)
					this.nextAction = activeBlockObj.returnActions.pop();
				else if (this.stack.length > 0)
					break;
				else
				{
					if (activeBlockObj.nextBlock)
					{
						this.activeBlock = activeBlockObj.nextBlock;
						this.nextAction = "Start";
					}
					else
					{
						this.runtime.EndMacro("Macro has completed..");
						return false;
					}
				}
				if (ret.wait)
					return true;
			}
		}
		if (this.stack.length > 0)
		{
			var nextToRun = this.stack.pop(),
				 me = this;
			this.activeBlock = nextToRun.activeBlock;
			this.nextAction = nextToRun.returnAction;
			if (ret && ret.wait)
				return true;
			window.setTimeout(function () { me.Run(); }, 1);
		}
		else
			this.runtime.EndMacro("Macro Completed--Stack Failed on Return from Call");
		return false;
	}

	FMPROT.CallBlock = function (call)
	{
		if (!call.vars)
			call.vars = this.runtime.macParmValues;
		if (!call.varsMeta)
			call.varsMeta = this.runtime.ParameterInfo;
		this.stack.push({ "activeBlock": this.activeBlock, "returnAction": call.returnAction });
		this.activeBlock = call.blockName;
		this.nextAction = "Start";
		this.Run(call.vars, call.varsMeta);
	}
} ());
