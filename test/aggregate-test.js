const tape = require('tape');
const field = require('vega-util').field;
const vega = require('vega-dataflow');
const changeset = vega.changeset;
const Collect = require('vega-transforms').collect;
const Nest = require('../').nest;

tape('Nest tuples', test => {
  const dataA = { "id": "A", "job": "Doctor" };
  const nodeA = { key: dataA.job, values: [dataA] };
  const childA = { data: dataA, height: 0, depth: 2 };
  const dataB = { "id": "B", "job": "Lawyer" };
  const nodeB = { key: dataB.job, values: [dataB] };
  const childB = { data: dataB, height: 0, depth: 2 };

  // Setup nest aggregation
  const df = new vega.Dataflow();
  const collect = df.add(Collect);
  const nest = df.add(Nest, { keys: [field('job')], pulse: collect });
  const out = df.add(Collect, { pulse: nest });

  // -- test adds
  df.pulse(collect, changeset().insert([dataA, dataB])).run();

  let expected = [dataA, dataB];
  expected.root = {
    data: { values: [nodeA, nodeB] },
    height: 2,
    depth: 0,
    parent: null,
    children: [
      { data: nodeA, height: 1, depth: 1, children: [childA] },
      { data: nodeB, height: 1, depth: 1, children: [childB] }
    ],
    lookup: { '1': childA, '2': childB },
  };

  // test and remove circular dependencies - tape's deepEqual crashes otherwise
  let d = out.value;
  test.equal(d.root.children[0].parent, d.root);
  test.equal(d.root.children[1].parent, d.root);
  test.equal(d.root.lookup['1'].parent, d.root.children[0]);
  test.equal(d.root.lookup['2'].parent, d.root.children[1]);
  delete d.root.children[0].parent;
  delete d.root.children[1].parent;
  delete d.root.lookup['1'].parent;
  delete d.root.lookup['2'].parent;

  test.deepEqual(d, expected);


  // -- test data removals
  df.pulse(collect, changeset().remove([dataA])).run();

  expected = [dataB];
  expected.root = {
    data: { values: [nodeB] },
    height: 2,
    depth: 0,
    parent: null,
    children: [{ data: nodeB, height: 1, depth: 1, children: [childB] }],

    // TODO: verify why lookup key here is '2', and not '1'?
    lookup: { '2': childB },
  };

  // test and remove circular dependencies - tape crashes otherwise
  d = out.value;
  test.equal(d.root.children[0].parent, d.root);
  test.equal(d.root.lookup['2'].parent, d.root.children[0]);
  delete d.root.children[0].parent;
  delete d.root.lookup['2'].parent;

  test.deepEqual(d, expected);

  test.end();
});
