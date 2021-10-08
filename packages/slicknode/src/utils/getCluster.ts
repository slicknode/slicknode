import cli from 'cli-ux';
import https from 'https';
import inquirer from 'inquirer';
import * as _ from 'lodash';
import fetch from 'node-fetch';
import Client from '@slicknode/client-node';
import { ICluster } from '../types';

const LIST_CLUSTER_QUERY = `query {
  listCluster(first: 100, filter: {node: {openForProjects: true}}) {
    edges {
      node {
        id
        alias
        name
        pingUrl
      }
    }
  }
}`;

interface IGetClusterParams {
  client: Client;
}

export async function getCluster(params: IGetClusterParams) {
  const { client } = params;
  cli.action.start('Load available clusters');
  const result = await client.fetch(LIST_CLUSTER_QUERY);
  const edges = _.get(result, 'data.listCluster.edges', []) as Array<{
    node: ICluster;
  }>;

  // We only have one cluster, return immediately
  if (edges.length === 1) {
    cli.action.stop();
    return edges[0].node;
  } else if (edges.length === 0) {
    return null;
  }

  // Use keepAlive to get more accurate latency without connection setup
  const agent = new https.Agent({
    keepAlive: true,
  });

  // Trigger requests to setup connections
  await Promise.all(
    edges.map(async ({ node }) => {
      try {
        await fetch(node.pingUrl, {
          timeout: 5000,
          agent,
        });
      } catch (e: any) {
        // tslint-ignore
      }
    })
  );

  // Determine latencies
  const dcTimers = await Promise.all(
    edges.map(async ({ node }) => {
      const start = Date.now();
      let latency;
      try {
        await fetch(node.pingUrl, {
          timeout: 5000,
          agent,
        });
        latency = Date.now() - start;
      } catch (e: any) {
        latency = null;
      }
      return {
        latency,
        cluster: node,
      };
    })
  );
  cli.action.stop();

  const inputValues = await inquirer.prompt<{ cluster: ICluster }>([
    {
      name: 'cluster',
      message: 'Select the cluster for the project:',
      type: 'list',
      choices: dcTimers
        .sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity))
        .map(({ cluster, latency }) => ({
          name: `${cluster.alias}: ${cluster.name} (latency: ${latency}ms)`,
          value: cluster,
        })),
    },
  ]);
  return inputValues.cluster;
}
