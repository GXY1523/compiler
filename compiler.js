// 创建编译器
// 词法分析、语法分析、代码转换、代码生成
/*
                  LISP            -->          C

   2 + 2          (add 2 2)                 add(2, 2)
   4 - 2          (subtract 4 2)            subtract(4, 2)
   2 + (4 - 2)    (add 2 (subtract 4 2))    add(2, subtract(4, 2))
*/

// 第一步 词法分析
function tokenizer(input) {
  let current = 0;
  let tokens = [];
  while (current < input.length) {
    let char = input[current];
    // 1.. 遇到左括号（
    if (char === "(") {
      tokens.push({
        type: "paren",
        value: "(",
      });
      current++;
      continue;
    }
    // 2.. 遇到右括号（
    if (char === ")") {
      tokens.push({
        type: "paren",
        value: ")",
      });
      current++;
      continue;
    }
    // 3.. 遇到空格，跳过
    let WHITESPACE = /\s/;
    if (WHITESPACE.test(char)) {
      current++;
      continue;
    }

    // 4.. 遇到数字,遍历从第一个数字开始，到不是数字结束（一串中无其他东西的数字组合在一起）
    // eg add(214,532) =>214 组合在一起 ，532组合在一起
    let NUMBERS = /[0-9]/;
    if (NUMBERS.test(char)) {
      let val = "";
      while (NUMBERS.test(char)) {
        val += char;
        char = input[++current];
      }
      tokens.push({
        type: "number",
        value: val,
      });
      continue;
    }

    // 5.. 遇到引号,从引号下一位开始遍历，直到遇到下一个引号结束
    // eg concat 'asd' 'qwe' ==> 要得到的是 asd  qwe
    if (char === "") {
      let val = "";
      char = input[++current]; //从引号下一位开始
      while (char !== '"') {
        val += char;
        char = input[++current];
      }
      char = input[++current]; //跳过下一个引号,指向引号的下一位
      tokens.push({
        type: "string",
        value: val,
      });
      continue;
    }

    // 6.. 操作符
    // eg. concat 'asd' 'qwe' 的 concat；add(214,532) 的 add
    let LETTERS = /[a-z]/i;
    if (LETTERS.test(char)) {
      let val = "";
      while (LETTERS.test(char)) {
        val += char;
        char = input[++current];
      }
      tokens.push({
        type: "name",
        value: val,
      });
      continue;
    }
    throw new TypeError("没有其他类型处理指定元素", char);
  }
  return tokens;
}

// 第二步 语法分析
function parser(tokens) {
  let current = 0;
  function walk() {
    let token = tokens[current];
    if (token.type === "number") {
      current++;
      return {
        type: "NumberLiteral",
        value: token.value,
      };
    }
    if (token.type === "string") {
      current++;
      return {
        type: "StringLiteral",
        value: token.value,
      };
    }
    // 遇到左括号
    if (token.type === "paren" && token.value === "(") {
      token = tokens[++current]; //左括号的下一个值
      let node = {
        type: "CallExpression",
        name: token.value,
        params: [],
      };
      token = tokens[++current];
      while (
        token.type !== "paren" ||
        (token.type === "paren" && token.value !== ")")
      ) {
        // 遇到的不是 右括号
        node.params.push(walk()); //去往下一层级
        token = tokens[current];
      }
      current++;
      return node;
    }
    throw new TypeError(token.type);
  }
  let ast = {
    type: "Program",
    body: [],
  };
  while (current < tokens.length) {
    ast.body.push(walk());
  }
  return ast;
}

// 第三步 代码转换
// visitor模式
function traverser(ast, visitor) {
  /*
    parent 表示当前的外部结点
            是关联整个执行过程的关键元素
  */
  //  遇到数组的处理
  function traverseArray(array, parent) {
    array.forEach((child) => {
      traverseNode(child, parent);
    });
  }
  // 非数组的处理
  function traverseNode(node, parent) {
    let methods = visitor[node.type];
    if (methods && methods.enter) {
      methods.enter(node, parent);
    }
    switch (node.type) {
      case "Program": //说明此时在入口文件处，body是个数组，因此用数组的方法处理
        traverseArray(node.body, node);
        break;
      case "CallExpression": // 遇到表达式（操作符add,subtract...），此时body也是一个数组
        traverseArray(node.params, node);
        break;
      case "NumberLiteral": //遇到number,string类型，不用处理
      case "StringLiteral":
        break;
      default: //遇到其他类型，报错
        throw new TypeError(node.type);
    }
    if (methods && methods.exit) {
      methods.exit(node, parent);
    }
  }
  traverseNode(ast, null);
}

/**
 * ----------------------------------------------------------------------------
 *   Original AST                     |   Transformed AST
 * ----------------------------------------------------------------------------
 *   {                                |   {
 *     type: 'Program',               |     type: 'Program',
 *     body: [{                       |     body: [{
 *       type: 'CallExpression',      |       type: 'ExpressionStatement',
 *       name: 'add',                 |       expression: {
 *       params: [{                   |         type: 'CallExpression',
 *         type: 'NumberLiteral',     |         callee: {
 *         value: '2'                 |           type: 'Identifier',
 *       }, {                         |           name: 'add'
 *         type: 'CallExpression',    |         },
 *         name: 'subtract',          |         arguments: [{
 *         params: [{                 |           type: 'NumberLiteral',
 *           type: 'NumberLiteral',   |           value: '2'
 *           value: '4'               |         }, {
 *         }, {                       |           type: 'CallExpression',
 *           type: 'NumberLiteral',   |           callee: {
 *           value: '2'               |             type: 'Identifier',
 *         }]                         |             name: 'subtract'
 *       }]                           |           },
 *     }]                             |           arguments: [{
 *   }                                |             type: 'NumberLiteral',
 *                                    |             value: '4'
 * ---------------------------------- |           }, {
 *                                    |             type: 'NumberLiteral',
 *                                    |             value: '2'
 *                                    |           }]
 *  (sorry the other one is longer.)  |         }
 *                                    |       }
 *                                    |     }]
 *                                    |   }
 */

function transformer(ast) {
  let newAst = {
    type: "Program",
    body: [],
  };
  ast._context = newAst.body;
  traverser(ast, {
    NumberLiteral: {
      enter(node, parent) {
        // 此时，enter的parent指向当前处理元素的parent
        // parent._context===ast._context === newAst.body
        parent._context.push({
          type: "NumberLiteral",
          value: node.value,
        });
      },
    },
    StringLiteral: {
      enter(node, parent) {
        // 此时，enter的parent指向当前处理元素的parent
        parent._context.push({
          type: "StringLiteral",
          value: node.value,
        });
      },
    },
    CallExpression: {
      enter(node, parent) {
        let expression = {
          type: "CallExpression",
          callee: {
            type: "Identifier",
            name: node.name,
          },
          arguments: [],
        };
        node._context = expression.arguments;
        if (parent.type !== "CallExpression") {
          expression = {
            type: "ExpressionStatement",
            expression: expression,
          };
        }
        parent._context.push(expression);
      },
    },
  });
  return newAst;
}

// 第四步 代码生成
function codeGenerator(node) {
  switch (node.type) {
    case "Program":
      return node.body.map(codeGenerator).join("\n"); //换行
    case "ExpressionStatement":
      return codeGenerator(node.expression) + ";"; //加分号
    case "CallExpression":
      return (
        codeGenerator(node.callee) +
        "(" +
        node.arguments.map(codeGenerator).join(",") +
        ")"
      );
    case "Identifier":
      return node.name;
    case "NumberLiteral":
      return node.value;
    case "StringLiteral":
      return '"' + node.value + '"';
    default:
      throw new TypeError(node.type);
  }
}

module.exports = {
  tokenizer,
  parser,
  transformer,
  codeGenerator,
};
