// Module Pattern for best performance and non-global vars
/// <reference path="../SCMacros.js" />
/// <reference path="../ScreenInfo.js" />
/// <reference path="../MacDesign.js" />
/// <reference path="../FlowEdit.js" />
/// <reference path="../MacrosMgr.htm" />
/// <reference path="../Plugin.js" />
(function ()
{
	if (!flow.xls)
		flow.xls = {};
	flow.xls.RefToIndex = function (ref)
	{
		var sum = 0,
			 AValue = "A".charCodeAt(0),
			 i;
		if (!ref)
			throw new Error('RefToIndex, Ref is null!');
		ref = ref.toUpperCase();
		for (i = 0; i < ref.length; ref++)
		{
			sum *= 26;
			sum += (ref.charCodeAt(i) - AValue + 1);
		}
		return sum;
	}

	flow.xls.crRegex = /([A-Za-z]{1,3}):([A-Za-z]{1,3})/;
	flow.xls.ColRangeChildren = function (range, existingChildren)
	{
		var children = [],
			 indexes = flow.xls.GetColRangeIndexes(range),
			 i, j, child, newColIndex, atColIndex, extProps, insertIndex;
		for (i = indexes.start; i <= indexes.end; i++)
		{
			child = {};
			child.name = 'Col' + i;
			child.type = 'CRangeIndex';
			child.ext$Props = extProps = { 'name': child.name, 'type': child.type, 'dynamicDef': true, 'immutable': true };
			extProps.colIndex = i;
			children.push(child);
		}
		if (existingChildren)
		{
			flow.xls.MergeChildren(children, existingChildren, 'colIndex');
			return existingChildren;
		}
		else
			return children;
	}
	flow.xls.InitColRangeExt = function (dynWin, matchVar)
	{
		range = 'A:';
		if (matchVar.children &&
			 (matchVar.children.length > 0) &&
			 (matchVar.children.length < 26))
		{
			range += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(matchVar.children.length - 1);
		}
		else
			range += 'D';
		dynWin.SetExtEntryVal('range', range);
	}

	flow.xls.MergeChildren = function (children, existingChildren, propName)
	{
		var i, j, atProp, newProp, insertIndex, child, extRef;
		for (i = 0; i < children.length; i++)
		{
			newProp = children[i].ext$Props[propName];
			insertIndex = existingChildren.length;
			for (j = 0; j < existingChildren.length; j++)
			{
				atProp = existingChildren[j].ext$Props[propName];
				if (atProp == newProp)
				{
					insertIndex = -1;
					break;
				}
				else if (atProp > newProp)
				{
					insertIndex = j;
					break;
				}
			}
			if (insertIndex != -1)
			{
				child = children[i];
				extRef = { "name": child.name, "type": child.type, "dynamicDef": true,
					"ext$Props": child.ext$Props
				};
				existingChildren.splice(insertIndex, 0, extRef);
			}
		}
		return existingChildren;
	}

	flow.xls.GetColRangeIndexes = function (range)
	{
		var match, indexes = {};

		match = flow.xls.crRegex.exec(range);
		indexes.start = flow.xls.RefToIndex(match[1]);
		indexes.end = flow.xls.RefToIndex(match[2]);
		return indexes;
	}

	flow.xls.xlsExtTypeList = {
		'Cell': {
			'text': 'Single Cell',
			'title': 'Addresses a single cell in the target Excel Spreadsheet, using a standard cell reference.',
			'hasChildren': false,
			'propNames':
			{
				'range':
				{
					'text': 'Cell Reference',
					'title': 'Hard-coded Row/Column reference like A2 for active Worksheet',
					'editRegex': /\$?[A-Za-z]{1,5}\$?\d{1,5}/
				}
			}
		},
		'ColRange':
		{
			'text': 'Range of Columns',
			'title': 'Addresses one or more rows of cells, described using a starting and ending column (as letters).',
			'hasChildren': true,
			'newChildrenFunc': function (extProp, existingChildren) { return flow.xls.ColRangeChildren(extProp.range, existingChildren); },
			'initFunc': function (dynWin, matchVar) { flow.xls.InitColRangeExt(dynWin, matchVar); },
			'propNames':
			{
				'range':
				{
					'text': 'Column Range',
					'title': 'Hard-coded range like A:M (First column must be to the left of second), read or written as a multiple-row set with start row and ending on blank line',
					'editRegex': /[A-Za-z]{1,3}:[A-Za-z]{1,3}/,
					'editFunc':
						function (text)
						{
							var indexes = flow.xls.GetColRangeIndexes(text);
							return (indexes.start < indexes.end);
						}
				},
				'StartRow':
				 { 'text': 'Start Row', 'title': 'Starting Row for read/write- must be 1 or higher and an integer value...',
				 	'editRegex': /\d{1,5}/,
				 	'defaultValue': 1,
				 	'editFunc': function (text) { return (parseInt(text) > 0); }
				 }
			}
		}
	};

	flow.xls.GetXlsExtTypeListCopy = function (filter)
	{
		var srcList = {},
			 prop;
		for (prop in flow.xls.xlsExtTypeList)
		{
			if (!filter ||
				 (filter.indexOf(prop) != -1))
				srcList[prop] = flow.xls.xlsExtTypeList[prop];
		}
		return srcList;
	}

	//------------------- Office File Opener -------------------------
	flow.macs.XlsData = function (runtime)
	{
		flow.macs.Plugin.call(this, runtime, 'xlsData',
								'Microsoft Excel Data Reader / Writer', true, true);
		this.r1c1regx = /=[rR](\d{1,5}?)[cC](\d{1,5}?)/;
		this.refToRegX = /=(\w{1,25})!\$([a-zA-Z]{1,5}?)\$(\d{1,6}?)/;
		this.refColRegX = /=(\w{1,25})!\$([a-zA-Z]{1,5}?):\$([a-zA-Z]{1,5}?)/;
		this.refRowRegX = /=(\w{1,25})!\$(\d{1,6}?):\$(\d{1,6}?)/;
		this.refSingleCell = /\$?[A-Za-z]{1,5}\$?\d{1,5}/;
		this.xlsNames = new Array();
		this.serverFolder = 'XlsData';
	}
	// XlsData inherits from Plugin
	flow.macs.XlsData.prototype = new flow.macs.Plugin();
	var XLPROT = flow.macs.XlsData.prototype; // convenience
	XLPROT.constructor = flow.macs.XlsData;

	XLPROT.InitDesigner = function (htDoc, parent, instanceId, design, extIsTarget)
	{
		if (!this.designer ||
			 (this.designer.extIsTarget != extIsTarget) ||
			 (this.designer.instanceId != instanceId))
			this.designer = new flow.macs.XlsDesigner(this, htDoc, parent, instanceId, design, extIsTarget);
		return this.designer;
	}

	XLPROT.GetTitle = function (extIsTarget)
	{
		if (extIsTarget)
			return 'Microsoft Excel Data Writer';
		else
			return 'Microsoft Excel Data Reader';
	}

	XLPROT.GetIcon = function (extIsTarget)
	{
		if (extIsTarget)
			return 'xlsWrite';
		else
			return 'xlsRead';
	}

	XLPROT.OpenReadDoc = function (docPath, visibility)
	{
		return this.OpenDoc(docPath, visibility, false);
	}

	XLPROT.OpenWriteDoc = function (docPath, visibility)
	{
		return this.OpenDoc(docPath, visibility, true);
	}

	// Define this when after a field match, the doc should be closed
	XLPROT.CloseMatchDoc = function (extIsTarget)
	{
		this.CloseDoc(extIsTarget);
	}

	XLPROT.CloseDoc = function (extIsTarget)
	{
		if (extIsTarget)
			this.CloseWriteDoc();
		else
			this.CloseReadDoc();
	}

	XLPROT.CloseReadDoc = function ()
	{
		if (this.oReadDoc)
		{
			this.readRowHeaders = null;
			this.readColLabels = null;
			this.oReadDoc.Quit();
			this.oReadDoc = null;
		}
	}

	XLPROT.CloseWriteDoc = function ()
	{
		if (this.oWriteDoc)
		{
			this.writeRowHeaders = null;
			this.writeColLabels = null;
			this.oWriteDoc.Quit();
			this.oWriteDoc = null;
		}
	}

	XLPROT.OpenDoc = function (docPath, visibility, extIsTarget)
	{
		try
		{
			if (extIsTarget)
			{
				var docFixedPath = flow.macs.GetFileRef(docPath);
				if (this.oWriteDoc &&
					 this.oWriteDoc.ActiveSheet &&
					 (this.activeWriteDocPath == docFixedPath))
					return this.oWriteDoc;
				if (this.oWriteDoc)
					this.CloseWriteDoc();
				this.activeWriteDocPath = docFixedPath;
				this.oWriteDoc = new ActiveXObject("Excel.Application"); // creates the word object
				if (visibility)
					this.oWriteDoc.Visible = visibility;
				this.oWriteDoc.WorkBooks.Open(docFixedPath); // specify path to document
				this.xlsAtWriteRow = 1;
				return this.oWriteDoc;
			}
			else
			{
				var docFixedPath = flow.macs.GetFileRef(docPath);
				if (this.oReadDoc &&
					 this.oReadDoc.ActiveSheet &&
					 (this.activeReadDocPath == docFixedPath))
					return this.oReadDoc;
				if (this.oReadDoc)
					this.CloseReadDoc();
				this.activeReadDocPath = docFixedPath;
				this.oReadDoc = new ActiveXObject("Excel.Application"); // creates the word object
				if (visibility)
					this.oReadDoc.Visible = visibility;
				this.oReadDoc.WorkBooks.Open(docFixedPath); // specify path to document
				this.xlsAtReadRow = 1;
				return this.oReadDoc;
			}
		}
		catch (e)
		{
			alert('OpenDoc failed for "' + docFixedPath + '": ' + e.message);
		}
		return null;
	}

	XLPROT.WriteNextXlsRow = function (parms, varsMeta)
	{
		this.xlsAtWriteRow++;
		this.WriteToXlsCells(parms, varsMeta);
	}

	XLPROT.SetColRange = function (oDoc, rows, info, xlsw, extPropName)
	{
		var atRow = xlsw.StartRow,
			 targets = {},
			 sheet = oDoc.activeSheet,
			 i, id, row, prop, atCol;
		for (id in info.varsMeta)
		{
			child = info.varsMeta[id];
			childProps = child[extPropName];
			if (childProps)
			{
				targets[id] = childProps.colIndex;
			}
		}
		for (i = 0; i < rows.length; i++)
		{
			row = rows[i];
			for (prop in row)
			{
				atCol = targets[prop];
				if (atCol) // colindexes always are 1+ so don't need to check for isnumber
					sheet.Cells(atRow, atCol).Value = "'" + row[prop];
			}
			atRow++;
		}
	}

	XLPROT.WriteToXlsCells = function (parms, varsMeta, extPropName)
	{
		var oDoc = this.oWriteDoc,
			 name, varMeta, value, xlsw,
			 headers = null, labels = null;
		if (!extPropName)
			extPropName = 'ext$XlsWriter';
		for (name in parms)
		{
			varMeta = varsMeta[name];
			if (varMeta && varMeta[extPropName])
			{
				value = parms[name];
				xlsw = varMeta[extPropName];
				switch (xlsw.type)
				{
					case 'ColRange':
						this.SetColRange(oDoc, value, varMeta, xlsw, extPropName);
						break;
					case 'Cell':
						oDoc.ActiveSheet.Range(xlsw.range).Value = value;
						break;
					case 'AtRowCell':
						oDoc.ActiveSheet.Cells(this.xlsAtWriteRow, xlsw.column).Value = value;
						break;
					case 'RowHeader':
						if (!headers)
							headers = this.GetXlsRowHeaders(true, 1, true);
						oDoc.ActiveSheet.Cells(this.xlsAtWriteRow, headers[xlsw.name].row).Value = value;
						break;
					case 'ColLabel':
						if (!labels)
							labels = this.GetXlsColLabels(true, 1, true);
						oDoc.ActiveSheet.Cells(labels[xlsw.name].row, 2).Value = value;
						break;
					case 'NamedCell':
						this.SetRefValue(oDoc, xlsw.name, value);
						break;
				}
			}
		}
	}

	XLPROT.GetXlsCellNames = function (oXLS)
	{
		var xlsNames = new Array();
		for (var n = 1; n <= oXLS.Names.Count; n++)
		{
			var name = oXLS.Names.Item(n);
			var ref = name.RefersTo;
			if (!ref)
				continue;
			var match = this.refToRegX.exec(ref);
			if (!match)
				continue;
			var value = this.GetRefValue(oXLS, name.Name);
			xlsNames.push({ 'name': name.Name, 'ext$Props': { 'name': name.Name, 'type': 'NamedCell' }, 'sheet': match[1], 'ref': ref,
				'sampleValue': value, 'nameType': 'NamedCell', 'type': 'cellName'
			});
		}
		return xlsNames;
	}

	XLPROT.GetXlsRowHeaders = function (forWriting, startColumn, asObject)
	{
		if (asObject)
		{
			if (forWriting && this.writeRowHeaders)
				return this.writeRowHeaders;
			if (!forWriting && this.readRowHeaders)
				return this.readRowHeaders;
		}
		var oXLS = (forWriting) ? this.oWriteDoc : this.oReadDoc;
		if (!startColumn)
			startColumn = 1;
		var xlsNames = (asObject) ? new Object : new Array();
		var sheet = oXLS.ActiveSheet;
		for (var c = startColumn; c < 100; c++)
		{
			try
			{
				var value = sheet.Cells(1, c).Value
				if (!value || (value == ''))
					break;
				var header = { 'name': value, 'ext$Props': { 'name': value, 'type': 'RowHeader', 'column': c }, 'column': c,
					'sheet': sheet.Name, 'sampleValue': 'column' + value, 'nameType': 'RowHeader', 'type': 'headerName'
				};
				if (asObject)
					xlsNames[value] = header;
				else
					xlsNames.push(header);
			}
			catch (e)
			{
				break;
			}
		}
		if (asObject)
		{
			if (forWriting)
				this.writeRowHeaders = xlsNames;
			else
				this.readRowHeaders = xlsNames;
		}
		return xlsNames;
	}

	XLPROT.GetXlsColLabels = function (forWriting, startRow, asObject)
	{
		if (asObject)
		{
			if (forWriting && this.writeColLabels)
				return this.writeColLabels;
			if (!forWriting && this.readColLabels)
				return this.readColLabels;
		}
		var oXLS = (forWriting) ? this.oWriteDoc : this.oReadDoc;
		if (!startRow)
			startRow = 1;
		var xlsNames = (asObject) ? new Object : new Array();
		var sheet = oXLS.ActiveSheet;
		for (var r = startRow; r < 100; r++)
		{
			try
			{
				var value = sheet.Cells(r, 1).Value
				if (!value || (value == ''))
					break;
				var label = { 'name': value, 'ext$Props': { 'name': value, 'type': 'ColLabel', 'row': r }, 'val': r,
					'sheet': sheet.Name, 'sampleValue': 'Row' + value, 'nameType': 'ColLabel', 'type': 'colLabel'
				};
				if (asObject)
					xlsNames[value] = label;
				else
					xlsNames.push(label);
			}
			catch (e)
			{
				break;
			}
		}
		if (asObject)
		{
			if (forWriting)
				this.writeColLabels = xlsNames;
			else
				this.readColLabels = xlsNames;
		}
		return xlsNames;
	}

	XLPROT.GetRefValue = function (oDoc, name)
	{
		if (!oDoc)
			return null;
		var wsrc = this.GetRef(oDoc, name);
		if (wsrc)
		{
			var sheet = oDoc.Sheets.Item(wsrc.sheet);
			return sheet.Cells(wsrc.row, wsrc.column).Value;
		}
		return null;
	}

	XLPROT.SetRefValue = function (oDoc, name, value)
	{
		if (!oDoc)
			return null;
		var wsrc = this.GetRef(oDoc, name);
		if (wsrc)
		{
			var sheet = oDoc.Sheets.Item(wsrc.sheet);
			sheet.Cells(wsrc.row, wsrc.column).Value = value;
			return true;
		}
		return false;
	}

	XLPROT.GetRef = function (oDoc, refName)
	{
		var name, ref, match;
		if (!oDoc)
			return null;
		name = oDoc.Names.Item(refName);
		if (!name)
			return null;
		ref = name.RefersTo;
		if (!ref)
			return null;
		match = this.refToRegX.exec(ref);
		if (!match)
			return null;
		return { 'sheet': match[1], 'row': parseInt(match[3]), 'column': flow.xls.RefToIndex(match[2]) };
	}

	XLPROT.ReadAllXlsRows = function (varsMeta, startRow)
	{
		var varName, info, parms, extDef, rows = [];
		if (!startRow)
			this.xlsAtReadRow = 1;
		else
			this.xlsAtReadRow = startRow;
		while (true)
		{
			parms = this.ReadFromXlsCells(null, varsMeta);
			if (!this.rowHasData)
				break;
			rows.push(parms);
			this.xlsAtReadRow++;
		}
		this.runtime.parmsList = rows;
		this.runtime.parmsListIndex = 0;
		return rows;
	}

	XLPROT.ReadNextXlsRow = function (parms, varsMeta)
	{
		this.xlsAtReadRow++;
		return this.ReadFromXlsCells(parms, varsMeta);
	}

	XLPROT.ReadMultiRows = function (oDoc, xlsr, outMeta, extPropName)
	{
		var atRow = xlsr.startRow,
			 metaSource = xlsr.metaSource,
			 endRow = xlsr.endRow,
			 name = xlsr.name,
			 sheet = oDoc.ActiveSheet,
			 rows, headers, i, colMeta, cols = [], id, col, blank, row, cell;
		rows = [];
		if (metaSource == 'RowHeaders')
			headers = this.GetXlsRowHeaders(false, 1, true);
		else
		{
			alert('XlsPlugin - ReadMultiRows unknown Metasource of "' + metaSource + '"');
			return;
		}
		for (id in outMeta.varsMeta)
		{
			colMeta = outMeta.varsMeta[id];
			if (colMeta[extPropName])
			{
				cols.push({ "name": id, "col": headers[colMeta[extPropName].name].column });
			}
		}
		while (atRow < 10000) // limit???
		{
			blank = true;
			row = {};
			for (i = 0; i < cols.length; i++)
			{
				col = cols[i];
				cell = sheet.Cells(atRow, col.col).Text;
				if (cell)
				{
					row[col.name] = cell = flow.macs.trim(cell);
					if (cell != '')
						blank = false;
				}
				else
					row[col.name] = '';
			}
			if (blank)
				break;
			rows.push(row);
			atRow++;
		}
		return rows;
	}

	XLPROT.ReadFromXlsCells = function (parms, varsMeta, extPropName)
	{
		this.rowHasData = false;
		var headers = null,
			 labels = null,
			 oDoc = this.oReadDoc,
			 varName, info, parm, xlsr, newValue;
		if (!extPropName)
			extPropName = 'ext$XlsReader';
		if (!parms)
			parms = {};
		for (varName in varsMeta)
		{
			info = varsMeta[varName];
			if (info[extPropName])
			{
				xlsr = info[extPropName];
				newValue = null;
				switch (xlsr.type)
				{
					case 'MultiRow':
						newValue = this.ReadMultiRows(oDoc, xlsr, info, extPropName);
						break;
					case 'Cell':
						newValue = oDoc.ActiveSheet.Range(xlsr.range).Value;
						break;
					case 'AtRowCell':
						newValue = oDoc.ActiveSheet.Cells(this.xlsAtReadRow, xlsr.column).Value;
						break;
					case 'NamedCell':
						newValue = this.GetRefValue(oDoc, xlsr.name);
						break;
					case 'RowHeader':
						if (!headers)
							headers = this.GetXlsRowHeaders(false, 1, true);
						newValue = oDoc.ActiveSheet.Cells(this.xlsAtReadRow, headers[xlsr.name].column).Value;
						break;
					case 'ColLabel':
						if (!labels)
							labels = this.GetXlsColLabels(false, 1, true);
						newValue = oDoc.ActiveSheet.Cells(labels[xlsr.name].row, 2).Value;
					case 'ColRange':
						newValue = this.GetColRange(oDoc, info, xlsr, extPropName);
						break;
				}
				parms[varName] = newValue;
				info.value = newValue;
				if (newValue &&
					 (newValue != ''))
					this.rowHasData = true;
			}
		}
		return parms;
	}

	XLPROT.GetColRange = function (oDoc, info, xlsr, extPropName)
	{
		var rows = [], row, colIndexes = flow.xls.GetColRangeIndexes(xlsr.range),
			 atRow = xlsr.StartRow, targets = [], targetIndex, id, i, child, childProps, rowHasData, value;
		for (id in info.varsMeta)
		{
			child = info.varsMeta[id];
			childProps = child[extPropName];
			if (childProps)
			{
				targets[childProps.colIndex - 1] = id;
			}
		}
		while (true)
		{
			rowHasData = false;
			row = {};
			for (i = colIndexes.start, targetIndex = 0; i <= colIndexes.end; i++, targetIndex++)
			{
				if (targets[targetIndex])
				{
					value = oDoc.ActiveSheet.Cells(atRow, i).Text;
					row[targets[targetIndex]] = value;
					if (value && value != '')
						rowHasData = true;
				}
			}
			if (rowHasData)
			{
				rows.push(row);
				atRow++;
			}
			else
				break;
		}
		return rows;
	}

	if (fvmCtl)
		fvmCtl.fvm.AddPlugin(flow.macs.XlsData);
	else
		alert('Plugin Loaded but no Macro Control object to bind to...');
} ());
