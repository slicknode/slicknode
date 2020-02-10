import cli from 'cli-ux';
import {ICluster} from '../types';
import Client from 'slicknode-client';
import _ from 'lodash';
import inquirer from 'inquirer';

const LIST_CLUSTER_QUERY = `query {
  listCluster(first: 100) {
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
  client: Client
}

export async function getCluster(params: IGetClusterParams) {
  const {client} = params;
  cli.action.start('Load available clusters');
  const result = await client.fetch(LIST_CLUSTER_QUERY);
  const edges = _.get(result, 'data.listCluster.edges', []) as Array<{node: ICluster}>;

  // We only have one cluster, return immediately
  if (edges.length === 1) {
    cli.action.stop();
    return edges[0].node;
  } else if (edges.length === 0) {
    return null;
  }

  // Determine latencies
  const dcTimers = await Promise.all(edges.map(async ({node}) => {
    const start = Date.now();
    let latency;
    try {
      await fetch(node.pingUrl);
      latency = Date.now() - start;
    } catch (e) {
      latency = null;
    }
    return {
      latency,
      cluster: node,
    };
  }));
  cli.action.stop();

  const inputValues = await inquirer.prompt<{cluster: ICluster}>([
    {
      name: 'cluster',
      message: 'Select the cluster for the project:',
      type: 'list',
      choices: dcTimers.sort(
        (a, b) => (a.latency || Infinity) - (b.latency || Infinity),
      ).map(({cluster, latency}) => ({
        name: `${cluster.alias}: ${cluster.name} (latency: ${latency}ms)`,
        value: cluster,
      })),
    },
  ]);
  return inputValues.cluster;
}