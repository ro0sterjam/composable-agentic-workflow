import { openai } from '@ai-sdk/openai';
import { Experimental_Agent as Agent, generateObject, jsonSchema, stepCountIs, tool } from 'ai';

import { executeDAGFromNode } from '../dag/executor';
import type { OpenAIModel } from '../nodes/impl/models';

import { interpolateString } from './interpolation';
import type { TransformerExecutor, DAGContext } from './registry';
import { getLoggerFromContext } from './registry';

/**
 * Internal config type that the executor receives (with JSON Schema)
 */
interface AgentTransformerNodeExecutorConfig {
  model: string; // Model string (e.g., 'openai/gpt-4o')
  system?: string;
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>; // JSON Schema
    transformerId: string;
  }>;
  maxLoops?: number; // Maximum number of tool call loops (if not set, no limit)
  schema?: Record<string, unknown>; // Optional JSON Schema for structured output
}

/**
 * Agent transformer executor - executes agent transformer nodes
 */
export class AgentExecutor<InputType = string, OutputType = string>
  implements TransformerExecutor<InputType, OutputType, AgentTransformerNodeExecutorConfig>
{
  async execute(
    input: InputType,
    config: AgentTransformerNodeExecutorConfig,
    dagContext: DAGContext
  ): Promise<OutputType> {
    const logger = getLoggerFromContext(dagContext);

    // Interpolate system prompt if provided
    const system = config.system ? interpolateString(config.system, input, dagContext) : undefined;

    // Convert input to string for the agent prompt
    const prompt = typeof input === 'string' ? input : JSON.stringify(input);

    // Check if it's an OpenAI model
    if (!config.model.startsWith('openai/')) {
      throw new Error(
        `Unsupported model: ${config.model}. Only OpenAI models are currently supported.`
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    // Extract model name (remove provider prefix)
    const modelName = config.model.split('/')[1] as OpenAIModel extends `openai/${infer M}`
      ? M
      : string;

    // Create tools that execute subgraphs
    const agentTools: Record<string, any> = {};
    for (const toolConfig of config.tools) {
      // Check if schema is an object type - AI SDK requires object type for tools
      const schema = toolConfig.inputSchema as Record<string, unknown>;
      const isObjectSchema = schema.type === 'object';

      let wrappedSchema: Record<string, unknown>;
      let needsUnwrap = false;

      if (!isObjectSchema) {
        // Wrap non-object schema (string, number, boolean, array, etc.) in an object
        // Use 'value' as the property name for non-object types
        wrappedSchema = {
          type: 'object',
          properties: {
            value: schema,
          },
          required: ['value'],
        };
        needsUnwrap = true;
      } else {
        wrappedSchema = schema;
      }

      // Use jsonSchema to wrap JSON Schema for AI SDK compatibility
      agentTools[toolConfig.name] = (tool as any)({
        description: toolConfig.description,
        inputSchema: jsonSchema(wrappedSchema),
        execute: async (args: Record<string, unknown>): Promise<unknown> => {
          logger.debug(
            `[AgentExecutor] Starting tool execution: '${toolConfig.name}' with args:`,
            JSON.stringify(args, null, 2)
          );

          // Unwrap if we wrapped a non-object schema
          let transformerInput: unknown;
          if (needsUnwrap) {
            const wrappedArgs = args as { value: unknown };
            transformerInput = wrappedArgs.value;
            logger.debug(
              `[AgentExecutor] Tool '${toolConfig.name}' unwrapped input (non-object schema):`,
              JSON.stringify(transformerInput, null, 2)
            );
          } else {
            transformerInput = args;
            logger.debug(
              `[AgentExecutor] Tool '${toolConfig.name}' using input as-is (object schema):`,
              JSON.stringify(transformerInput, null, 2)
            );
          }

          logger.debug(
            `[AgentExecutor] Tool '${toolConfig.name}' executing subgraph starting from node: ${toolConfig.transformerId}`
          );
          logger.debug(
            `[AgentExecutor] Tool '${toolConfig.name}' input:`,
            JSON.stringify(transformerInput, null, 2)
          );

          let result;
          try {
            // Execute the subgraph starting from the transformer node
            // Pass the cache from dagContext so subgraphs can access cached values
            result = await executeDAGFromNode(dagContext.dag, toolConfig.transformerId, {
              executorRegistry: dagContext.executorRegistry,
              input: transformerInput,
              cache: dagContext.cache,
              onNodeStart: (nodeId) => {
                logger.debug(
                  `[AgentExecutor] Tool '${toolConfig.name}' subgraph node started: ${nodeId}`
                );
              },
              onNodeComplete: (nodeId, nodeResult) => {
                if (nodeResult.error) {
                  logger.error(
                    `[AgentExecutor] Tool '${toolConfig.name}' subgraph node '${nodeId}' failed:`,
                    nodeResult.error.message
                  );
                  logger.error(
                    `[AgentExecutor] Tool '${toolConfig.name}' subgraph node '${nodeId}' error stack:`,
                    nodeResult.error.stack
                  );
                } else {
                  logger.debug(
                    `[AgentExecutor] Tool '${toolConfig.name}' subgraph node '${nodeId}' completed`
                  );
                  if (nodeResult.output !== undefined) {
                    logger.debug(
                      `[AgentExecutor] Tool '${toolConfig.name}' subgraph node '${nodeId}' output type:`,
                      typeof nodeResult.output
                    );
                  }
                }
              },
            });
          } catch (executeError) {
            logger.error(
              `[AgentExecutor] Tool '${toolConfig.name}' subgraph execution threw an exception:`,
              executeError
            );
            if (executeError instanceof Error) {
              logger.error(
                `[AgentExecutor] Tool '${toolConfig.name}' exception message:`,
                executeError.message
              );
              logger.error(
                `[AgentExecutor] Tool '${toolConfig.name}' exception stack:`,
                executeError.stack
              );
            }
            throw executeError;
          }

          if (!result.success) {
            logger.error(`[AgentExecutor] Tool '${toolConfig.name}' subgraph execution failed`);
            logger.error(
              `[AgentExecutor] Tool '${toolConfig.name}' execution result:`,
              JSON.stringify(
                Array.from(result.results.entries()).map(([id, r]) => ({
                  nodeId: id,
                  hasOutput: r.output !== undefined,
                  hasError: r.error !== undefined,
                  error: r.error?.message,
                })),
                null,
                2
              )
            );

            // Find the first error
            let foundError = false;
            for (const [nodeId, nodeResult] of result.results.entries()) {
              if (nodeResult.error) {
                foundError = true;
                logger.error(
                  `[AgentExecutor] Tool '${toolConfig.name}' error in node '${nodeId}':`,
                  nodeResult.error.message
                );
                logger.error(
                  `[AgentExecutor] Tool '${toolConfig.name}' error stack:`,
                  nodeResult.error.stack
                );
                throw new Error(
                  `Error executing tool subgraph: ${nodeResult.error.message} (node: ${nodeId})`
                );
              }
            }

            if (!foundError) {
              logger.error(
                `[AgentExecutor] Tool '${toolConfig.name}' subgraph execution failed but no errors found in results`
              );
              logger.error(
                `[AgentExecutor] Tool '${toolConfig.name}' executed nodes:`,
                Array.from(result.results.keys()).join(', ')
              );
              logger.error(
                `[AgentExecutor] Tool '${toolConfig.name}' result.success:`,
                result.success
              );
              logger.error(
                `[AgentExecutor] Tool '${toolConfig.name}' result.results.size:`,
                result.results.size
              );
              throw new Error(
                `Error executing tool subgraph: execution failed but no error details available`
              );
            }
          }

          logger.debug(
            `[AgentExecutor] Tool '${toolConfig.name}' subgraph execution completed successfully`
          );

          // Extract output from the tool subgraph
          // Find nodes with no outgoing edges in the executed subgraph (terminal nodes)
          const executedNodeIds = new Set(result.results.keys());
          const terminalNodes = Array.from(executedNodeIds).filter((nodeId) => {
            // Check if this node has any outgoing edges to other executed nodes
            return !dagContext.dag.edges.some(
              (edge) => edge.from === nodeId && executedNodeIds.has(edge.to)
            );
          });

          // Filter to only terminal nodes that have defined output (skip terminal executors like Console)
          const terminalNodesWithOutput = terminalNodes.filter((nodeId) => {
            const nodeResult = result.results.get(nodeId);
            return nodeResult?.output !== undefined;
          });

          logger.debug(
            `[AgentExecutor] Tool '${toolConfig.name}' found ${terminalNodesWithOutput.length} terminal node(s) with output`
          );

          // Prefer the transformer node's output if it exists and is defined
          let output: unknown;
          const transformerResult = result.results.get(toolConfig.transformerId);
          if (transformerResult?.output !== undefined) {
            // If transformer node is a terminal node with output, use it
            if (terminalNodesWithOutput.includes(toolConfig.transformerId)) {
              output = transformerResult.output;
              logger.debug(
                `[AgentExecutor] Tool '${toolConfig.name}' using transformer node output (terminal node)`
              );
            } else if (terminalNodesWithOutput.length > 0) {
              // If transformer node has downstream nodes, prefer the downstream terminal node's output
              const terminalResult = result.results.get(terminalNodesWithOutput[0]);
              if (terminalResult?.output !== undefined) {
                output = terminalResult.output;
                logger.debug(
                  `[AgentExecutor] Tool '${toolConfig.name}' using terminal node output: ${terminalNodesWithOutput[0]}`
                );
              }
            } else {
              // No terminal nodes with output, use transformer node's output
              output = transformerResult.output;
              logger.debug(
                `[AgentExecutor] Tool '${toolConfig.name}' using transformer node output (no terminal nodes)`
              );
            }
          } else if (terminalNodesWithOutput.length > 0) {
            // Transformer node has no output, use terminal node's output
            const terminalResult = result.results.get(terminalNodesWithOutput[0]);
            if (terminalResult?.output !== undefined) {
              output = terminalResult.output;
              logger.debug(
                `[AgentExecutor] Tool '${toolConfig.name}' using terminal node output (transformer has no output): ${terminalNodesWithOutput[0]}`
              );
            }
          }

          if (output === undefined) {
            logger.error(
              `[AgentExecutor] Tool '${toolConfig.name}' completed but no output found. Transformer node: ${toolConfig.transformerId}`
            );
            logger.error(
              `[AgentExecutor] Tool '${toolConfig.name}' executed nodes:`,
              Array.from(result.results.keys()).join(', ')
            );
            throw new Error(
              `No output found from tool subgraph execution. Transformer node: ${toolConfig.transformerId}`
            );
          }

          logger.debug(
            `[AgentExecutor] Tool '${toolConfig.name}' completed successfully. Output type: ${typeof output}, Output preview:`,
            typeof output === 'string'
              ? output.substring(0, 200) + (output.length > 200 ? '...' : '')
              : Array.isArray(output)
                ? `Array(${output.length} items)`
                : typeof output === 'object'
                  ? JSON.stringify(output, null, 2).substring(0, 200) + '...'
                  : String(output)
          );
          logger.debug(
            `[AgentExecutor] Tool '${toolConfig.name}' result:`,
            JSON.stringify(output, null, 2).substring(0, 500) +
              (JSON.stringify(output, null, 2).length > 500 ? '...' : '')
          );

          return output;
        },
      });
    }

    // Create the agent
    // Configure stopWhen based on maxLoops if provided
    // If maxLoops is not set, use a very high number (effectively no limit)
    // The agent will stop when it generates text instead of calling a tool, or when maxLoops is reached
    const agentConfig: any = {
      model: openai(modelName),
      ...(system && { system }),
      tools: agentTools as any,
    };

    if (config.maxLoops !== undefined) {
      agentConfig.stopWhen = stepCountIs(config.maxLoops);
      logger.debug(`[AgentExecutor] Agent configured with maxLoops: ${config.maxLoops}`);
    } else {
      // No limit - use a very high number (1000 steps should be more than enough)
      agentConfig.stopWhen = stepCountIs(1000);
      logger.debug(
        `[AgentExecutor] Agent configured with no maxLoops limit (using 1000 as practical limit)`
      );
    }

    logger.debug(
      `[AgentExecutor] Creating agent with ${config.tools.length} tool(s):`,
      config.tools.map((t) => t.name).join(', ')
    );

    // If schema is provided, use structured output
    if (config.schema) {
      logger.debug(`[AgentExecutor] Starting agent execution with structured output...`);
      logger.warn(
        `[AgentExecutor] Structured output with tools: The agent will generate text using tools, then parse the final output according to the schema.`
      );

      // Use agent with tools to generate text
      const agent = new Agent(agentConfig);
      const agentResult = await agent.generate({
        prompt,
      });

      const agentText = agentResult.text || '';

      logger.debug(
        `[AgentExecutor] Agent completed with tools. Parsing output according to schema...`
      );

      // Parse the agent's text output according to the schema
      // We'll use generateObject to parse/validate the text output
      const schema = config.schema as Record<string, unknown>;
      const isObjectSchema = schema.type === 'object';

      let wrappedSchema: Record<string, unknown>;
      let needsUnwrap = false;

      if (!isObjectSchema) {
        // Wrap non-object schema (array, string, number, boolean, etc.) in an object
        // Use 'value' as the property name for non-object types
        wrappedSchema = {
          type: 'object',
          properties: {
            value: schema,
          },
          required: ['value'],
        };
        needsUnwrap = true;
      } else {
        wrappedSchema = schema;
      }

      // Use generateObject to parse the agent's output according to the schema
      // This ensures the output conforms to the schema
      const parseResult = await generateObject({
        model: openai(modelName),
        schema: jsonSchema(wrappedSchema),
        prompt: `Parse the following text output from an AI agent and return it in the requested schema format:\n\n${agentText}`,
        ...(system && {
          system:
            system +
            '\n\nReturn only the parsed output in the requested schema format, without any additional explanation.',
        }),
      });

      logger.debug(`[AgentExecutor] Agent execution with structured output completed`);

      // Unwrap if we wrapped a non-object schema
      if (needsUnwrap) {
        const wrappedResult = parseResult.object as { value: OutputType };
        return wrappedResult.value;
      }

      return parseResult.object as OutputType;
    }

    // No schema - use regular agent generation with tools
    const agent = new Agent(agentConfig);

    logger.debug(`[AgentExecutor] Starting agent execution...`);

    const result = await agent.generate({
      prompt,
    });

    const finalText = result.text || '';

    logger.debug(
      `[AgentExecutor] Agent execution completed. Response length: ${finalText.length} characters`
    );

    return finalText as OutputType;
  }
}
