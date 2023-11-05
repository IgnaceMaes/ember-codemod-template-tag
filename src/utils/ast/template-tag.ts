import { AST as AST_JS } from '@codemod-utils/ast-javascript';
import { Preprocessor } from 'content-tag';
import { types } from 'recast';

type Range = {
  end: number;
  start: number;
};

type ContentTag = {
  contentRange: Range;
  contents: string;
  endRange: Range;
  range: Range; // range = startRange + contentRange + endRange
  startRange: Range;
  tagName: string;
  type: string;
};

export function parse(file: string) {
  const preprocessor = new Preprocessor();

  return preprocessor.parse(file) as unknown as ContentTag[];
}

export function replaceContents(
  file: string,
  options: {
    contents: string;
    range: Range;
  },
): string {
  const { contents, range } = options;

  return [
    file.substring(0, range.start),
    '<template>',
    contents,
    '</template>',
    file.substring(range.end),
  ].join('');
}

function _print(ast: types.ASTNode, contentTags: ContentTag[]): string {
  let output = AST_JS.print(ast);

  const placeholderContentTags = parse(output);
  if (placeholderContentTags.length !== contentTags.length) {
    throw new Error('The number of content tags does not match');
  }
  const contentTagMap = contentTags.map((k, i) => {
    return {
      original: k,
      placeholder: placeholderContentTags[i],
    };
  });
  contentTagMap.reverse().forEach((match) => {
    output = replaceContents(output, {
      contents: match.original.contents,
      range: match.placeholder!.range,
    });
  });

  return output;
}

interface TraverseTT {
  ast: types.ASTNode;
  contentTags: ContentTag[];
}

function _traverse(
  isTypeScript?: boolean,
): (file: string, visitMethods?: types.Visitor) => TraverseTT {
  const originalTraverse = AST_JS.traverse(isTypeScript);
  return function (
    file: string,
    visitMethods?: types.Visitor<unknown> | undefined,
  ): TraverseTT {
    const contentTags = parse(file);
    contentTags.reverse().forEach((contentTag, index) => {
      file = replaceContents(file, {
        contents: `${index}`,
        range: contentTag.range,
      });
    });

    return {
      ast: originalTraverse(file, visitMethods),
      contentTags: contentTags,
    };
  };
}

/**
 * Provides methods from `recast` to help you parse and transform
 * `*.{gjs,gts}` files.
 *
 * @example
 *
 * ```ts
 * function transformCode(file: string, isTypeScript: boolean): string {
 *   const traverse = AST.traverse(isTypeScript);
 *
 *   const { ast, contentTags } = traverse(file, {
 *     // Use AST.builders to transform the tree
 *   });
 *
 *   return AST.print(ast, contentTags);
 * }
 * ```
 */
export const AST = {
  builders: AST_JS.builders,
  print: _print,
  traverse: _traverse,
};
