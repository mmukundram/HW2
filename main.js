var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var faker = require("faker");
var fs = require("fs");
faker.locale = "en";
var mock = require('mock-fs');
var _ = require('underscore');
var Random = require('random-js');
var MyString = require('string');

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		args = ["subject.js"];
	}
	var filePath = args[0];

	var operatorArray = ['==', '!=', '>', '<', '||'];
	
	var obeyArray = [];
	var currFuncIndex = 0;
	var content = "var subject = require('./" + filePath + "')\nvar mock = require('mock-fs');\n";
	fs.writeFileSync('test.js', content, "utf8");

	constraints(filePath);

	generateTestCases();
}
var engine = Random.engines.mt19937().autoSeed();

function createConcreteIntegerValue( greaterThan, constraintValue )
{
	if( greaterThan )
		return Random.integer(constraintValue,constraintValue+10)(engine);
	else
		return Random.integer(constraintValue-10,constraintValue)(engine);
}

function Constraint(properties)
{
	this.ident = properties.ident;
	this.expression = properties.expression;
	this.operator = properties.operator;
	this.value = properties.value;
	this.funcName = properties.funcName;
	// Supported kinds: "pathExists", "pathWithFileWithoutContent", "pathWithFileWithContent", "fileExists", "fileWithoutContent", "fileWithContent"
	// integer, string, phoneNumber
	this.kind = properties.kind;
}

function fakeDemo()
{
	console.log( faker.phone.phoneNumber() );
	console.log( faker.phone.phoneNumberFormat() );
	console.log( faker.phone.phoneFormats() );
}

var functionConstraints =
{
}

var mockFileLibrary = 
{
	pathExists:
	{
		'path/fileExists': 
		{
		}
	},
	pathWithFileWithoutContent:
	{
		'path/fileExists': 
		{
			file1: '',
		}
	},
	pathWithFileWithContent: 
	{
		'path/fileExists': 
		{
			file1: 'text content',
		}
	},
	fileExists:
	{
		pathContent:
		{
		}
	},
	fileWithoutContent:
	{
		pathContent:
		{
			file1: '',
		}
	},
	fileWithContent:
	{
		pathContent: 
		{	
  			file1: 'text content',
		}
	}
};

function initalizeParams(constraints)
{
	var params = {};
	
	// initialize params
	for (var i =0; i < constraints.params.length; i++ )
	{
		var paramName = constraints.params[i];
		params[paramName] = '\'\'';
	}
	return params;	
}

// Ref: https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
function cartesianProduct() {
    return _.reduce(arguments, function(a, b) {
        return _.flatten(_.map(a, function(x) {
            return _.map(b, function(y) {
                return x.concat([y]);
            });
        }), true);
    }, [ [] ]);
};

function generateTestCases()
{
	var content = '';
	for ( var funcName in functionConstraints )
	{
		var params = {};
		var arguments_in_order = [];
		for (var i = 0; i < functionConstraints[funcName].params.length; i++ )
		{
			var paramName = functionConstraints[funcName].params[i];
			arguments_in_order.push(paramName);		
			params[paramName] = '\'\'';
		}
		var constraints = functionConstraints[funcName].constraints;
		var fileWithContent = _.some(constraints, {kind: 'fileWithContent' });
		var pathExists      = _.some(constraints, {kind: 'fileExists' });
		var pathWithFileWithContent = _.some(constraints, {kind: 'pathWithFileWithContent'});
		var pathWithFileWithoutContent = _.some(constraints, {kind: 'pathWithFileWithoutContent'});
		var fileExists = _.some(constraints, {kind: 'fileExists'});
		var my_dictionary = {};
		console.log('Constraints');
		console.log(constraints);
		console.log('\n');
		for( var j = 0; j < constraints.length; j++ )
		{
			var constraint = constraints[j];
			if( params.hasOwnProperty( constraint.ident ) )
			{
				if(my_dictionary[constraint.ident]==undefined)
				{
					my_dictionary[constraint.ident] = [];
				}
				if(my_dictionary[constraint.ident].indexOf(constraint.value) == -1)
				{
					my_dictionary[constraint.ident].push(constraint.value);
				}
			}
		}
		var my_length = Object.keys(my_dictionary).length;
		var my_arguments = [];

		for(var element in arguments_in_order)
		{
			my_arguments.push(my_dictionary[arguments_in_order[element]]);
		}

		var cp = cartesianProduct.apply(this,my_arguments);
		console.log('CP');
		console.log(cp);

		for(var my_args in cp)
		{
			args = '';
			for(var element in cp[my_args])
			{
				args+=cp[my_args][element];
				args+=',';
			}
			args = args.substring(0,args.length-1);
			console.log('Arguments');
			console.log(args);			
			if( pathExists || fileWithContent )
			{
				content += generateMockFsTestCases(pathExists, !pathWithFileWithContent, pathWithFileWithoutContent, fileExists, fileWithContent,funcName, args);
				content += generateMockFsTestCases(pathExists, !pathWithFileWithContent, pathWithFileWithoutContent, !fileExists, fileWithContent,funcName, args);
				content += generateMockFsTestCases(pathExists, !pathWithFileWithContent, pathWithFileWithoutContent, !fileExists, !fileWithContent,funcName, args);
				content += generateMockFsTestCases(!pathExists,pathWithFileWithContent, pathWithFileWithoutContent, fileExists, fileWithContent,funcName, args);
				content += generateMockFsTestCases(!pathExists,pathWithFileWithContent, pathWithFileWithoutContent, !fileExists, fileWithContent,funcName, args);
				content += generateMockFsTestCases(!pathExists,pathWithFileWithContent, pathWithFileWithoutContent, !fileExists, !fileWithContent,funcName, args);
				content += generateMockFsTestCases(!pathExists,!pathWithFileWithContent, pathWithFileWithoutContent, fileExists, fileWithContent,funcName, args);
				content += generateMockFsTestCases(!pathExists,!pathWithFileWithContent, pathWithFileWithoutContent, !fileExists, fileWithContent,funcName, args);
				content += generateMockFsTestCases(!pathExists,!pathWithFileWithContent, pathWithFileWithoutContent, !fileExists, !fileWithContent,funcName, args);
				content += generateMockFsTestCases(!pathExists,!pathWithFileWithContent, !pathWithFileWithoutContent, fileExists, fileWithContent,funcName, args);
			}
			else
			{
				content += ("subject."+funcName+"("+args+");\n");
			}
		}
	}

	fs.appendFile('test.js', content, function (err) 
	{
		if (err) 
			return console.log(err);
	});
}

function generateMockFsTestCases (pathExists, pathWithFileWithContent, pathWithFileWithoutContent, fileExists, fileWithContent, funcName, args) 
{
	var testCase = "";	
	var mergedFS = {};
	if(pathExists)
	{
		for (var attrname in mockFileLibrary.pathExists) { mergedFS[attrname] = mockFileLibrary.pathExists[attrname]; }
	}
	else if(pathWithFileWithContent)
	{
		for (var attrname in mockFileLibrary.pathWithFileWithContent) { mergedFS[attrname] = mockFileLibrary.pathWithFileWithContent[attrname]; }
	}
	else if(pathWithFileWithoutContent)
	{
		for (var attrname in mockFileLibrary.pathWithFileWithoutContent) { mergedFS[attrname] = mockFileLibrary.pathWithFileWithoutContent[attrname]; }
		console.log('Hello world');
	}

	if(fileExists)
	{
		for (var attrname in mockFileLibrary.fileExists) { mergedFS[attrname] = mockFileLibrary.fileExists[attrname]; }
	}
	else if(fileWithContent)
	{
		for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
	}
	else
	{
		for (var attrname in mockFileLibrary.fileWithoutContent) { mergedFS[attrname] = mockFileLibrary.fileWithoutContent[attrname]; }
	}

	testCase += 
	"mock(" +
		JSON.stringify(mergedFS)
		+
	");\n";

	testCase += "\tsubject.{0}({1});\n".format(funcName, args );
	testCase+="mock.restore();\n";
	return testCase;
}

function constraints(filePath)
{
   var buf = fs.readFileSync(filePath, "utf8");
	var result = esprima.parse(buf, options);

	traverse(result, function (node) 
	{
		if (node.type === 'FunctionDeclaration') 
		{
			var funcName = functionName(node);
			console.log("Line : {0} Function: {1}".format(node.loc.start.line, funcName ));

			var params = node.params.map(function(p) {return p.name});

			functionConstraints[funcName] = {constraints:[], params: params};

			var params_with_constraints = [];

			traverse(node, function(child)
			{
				if( child.type === 'LogicalExpression' )
				{
					if( child.right.type == 'UnaryExpression' && child.right.argument.type == 'MemberExpression')
					{	
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.right.argument.object.name,
								value: "true",
								funcName: funcName,
								kind: "integer", 
								operator : child.operator,
								expression: buf.substring(child["range"][0], child["range"][1])
							}));
							var param_with_constraint = child.right.argument.object.name;
							if(params_with_constraints.indexOf(param_with_constraint) == -1)
								params_with_constraints.push(param_with_constraint);
					}
				}
				if( child.type === 'BinaryExpression' && (child.operator == "==" || child.operator == "!=") )
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])

						if(rightHand.indexOf('\"')!=-1)
						{
							var altvalue = rightHand.substring(0,rightHand.length-1);
							altvalue += "1";
							altvalue += "\"";
						}
						else if(rightHand == "undefined")
						{
							var altvalue = "\"defined\"";
						}
						else
						{
							var altvalue = rightHand + 1;
						}
						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: rightHand,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}));
						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: altvalue,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}));
						var param_with_constraint = child.left.name;
						if(params_with_constraints.indexOf(param_with_constraint) == -1)
							params_with_constraints.push(param_with_constraint);
					}
				}

				if( child.type === 'BinaryExpression' && (child.operator == "<" || child.operator == "<=") )
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])

						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand) - 1,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}));
						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand) + 1,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}));
						var param_with_constraint = child.left.name;
						if(params_with_constraints.indexOf(param_with_constraint) == -1)
							params_with_constraints.push(param_with_constraint);
					}
				}

				if( child.type === 'BinaryExpression' && (child.operator == ">" || child.operator == ">=") )
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])

						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand) + 1,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}));
						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand) - 1,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}));
						var param_with_constraint = child.left.name;
						if(params_with_constraints.indexOf(param_with_constraint) == -1)
							params_with_constraints.push(param_with_constraint);
					}
				}

				if( child.type == "CallExpression" && 
					 child.callee.property &&
					 child.callee.property.name =="readFileSync" )
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: params[p],
									value:  "'pathContent/file1'",
									funcName: funcName,
									kind: "fileWithContent",
									operator : child.operator,
									expression: expression
								}));
							functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: params[p],
									value:  "'pathContent/file1'",
									funcName: funcName,
									kind: "fileWithoutContent",
									operator : child.operator,
									expression: expression
								}));
							functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: params[p],
									value:  "'pathContent/file1'",
									funcName: funcName,
									kind: "pathExists",
									operator : child.operator,
									expression: expression
								}));
							var param_with_constraint = params[p];
							if(params_with_constraints.indexOf(param_with_constraint) == -1)
								params_with_constraints.push(param_with_constraint);
						}
					}
				}

				if( child.type == "CallExpression" &&
					 child.callee.property &&
					 child.callee.property.name =="existsSync")
				{
					my_ident_name = child["arguments"][0]["name"];
					if(my_ident_name.indexOf('f')==-1) console.log('mydir');
					else console.log('myfile');
					console.log(my_ident_name);
				


					if(my_ident_name.indexOf('f')==-1)
					{
						for( var p =0; p < params.length; p++ )
						{
							if( child.arguments[0].name == params[p] )
							{
								functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: params[p],
									value:  "'path/fileExists'",
									funcName: funcName,
									kind: "pathWithFileWithContent",
									operator : child.operator,
									expression: expression
								}));
								functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: params[p],
									value:  "'path/fileExists'",
									funcName: funcName,
									kind: "pathWithFileWithoutContent",
									operator : child.operator,
									expression: expression
								}));
								functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: params[p],
									value:  "'path/fileExists'",
									funcName: funcName,
									kind: "pathExists",
									operator : child.operator,
									expression: expression
								}));
								functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: params[p],
									value:  "'noPath'",
									funcName: funcName,
									kind: "pathExists",
									operator : child.operator,
									expression: expression
								}));
								var param_with_constraint = params[p];
								if(params_with_constraints.indexOf(param_with_constraint) == -1)
									params_with_constraints.push(param_with_constraint);

							}
						}
					}
					else
					{
						for( var p =0; p < params.length; p++ )
						{
							if( child.arguments[0].name == params[p] )
							{
								functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: params[p],
									value:  "'path/fileExists/file1'",
									funcName: funcName,
									kind: "pathWithFileWithContent",
									operator : child.operator,
									expression: expression
								}));
								functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: params[p],
									value:  "'path/fileExists/file1'",
									funcName: funcName,
									kind: "pathWithFileWithoutContent",
									operator : child.operator,
									expression: expression
								}));/*
								functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: params[p],
									value:  "'path/fileExists'",
									funcName: funcName,
									kind: "pathExists",
									operator : child.operator,
									expression: expression
								}));*/
								var param_with_constraint = params[p];
								if(params_with_constraints.indexOf(param_with_constraint) == -1)
									params_with_constraints.push(param_with_constraint);
							}
						}
					}
				}
				if( child.type == "CallExpression" &&
					 child.callee.property &&
					 child.callee.property.name =="indexOf")
				{


					for( var p =0; p < params.length; p++ )
					{
						if( child["callee"]["object"]["name"] == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: params[p],
									value:  "\""+child["arguments"][0]["value"]+"\"",
									funcName: funcName,
									kind: "integer",
									operator : "==",
									expression: buf.substring(child["range"][0], child["range"][1])
								}));
								var param_with_constraint = params[p];
								if(params_with_constraints.indexOf(param_with_constraint) == -1)
									params_with_constraints.push(param_with_constraint);
						}

					}
				}

			});

			console.log( functionConstraints[funcName]);
			for( var p =0; p < params.length; p++ )
			{
				if(params_with_constraints.indexOf(params[p]==-1))
				{
						functionConstraints[funcName].constraints.push( 
						new Constraint(
						{
							ident: params[p],
							value:  "\"defined\"",
							funcName: funcName,
							kind: "integer",
							operator : "==",
							expression: "unknown"
						}));
				}
			}
		}
	});
	console.log('FC');
	console.log(functionConstraints.format.constraints);
}

function traverse(object, visitor) 
{
    var key, child;

    visitor.call(null, object);
    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null) {
                traverse(child, visitor);
            }
        }
    }
}

function traverseWithCancel(object, visitor)
{
    var key, child;

    if( visitor.call(null, object) )
    {
	    for (key in object) {
	        if (object.hasOwnProperty(key)) {
	            child = object[key];
	            if (typeof child === 'object' && child !== null) {
	                traverseWithCancel(child, visitor);
	            }
	        }
	    }
 	 }
}

function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "";
}


if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

main();
exports.main = main;
