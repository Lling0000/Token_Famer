const moduleNames = [
  'auth',
  'wallet',
  'gateway',
  'farm',
  'social',
  'payment',
  'leaderboard',
  'admin',
];

const deepModuleImportRules = moduleNames.flatMap((source) =>
  moduleNames
    .filter((target) => target !== source)
    .map((target) => ({
      name: `${source}-must-use-${target}-public-api`,
      severity: 'error',
      from: { path: `^modules/${source}/` },
      to: { path: `^modules/${target}/(?!index\\.ts$)` },
    })),
);

module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'web-must-not-import-other-apps',
      severity: 'error',
      from: { path: '^apps/web/' },
      to: { path: '^apps/(api|worker)/' },
    },
    {
      name: 'api-must-not-import-other-apps',
      severity: 'error',
      from: { path: '^apps/api/' },
      to: { path: '^apps/(web|worker)/' },
    },
    {
      name: 'worker-must-not-import-other-apps',
      severity: 'error',
      from: { path: '^apps/worker/' },
      to: { path: '^apps/(web|api)/' },
    },
    {
      name: 'web-must-not-import-server',
      severity: 'error',
      from: { path: '^apps/web/' },
      to: { path: '^(modules/|packages/db-runtime/|apps/(api|worker)/)' },
    },
    {
      name: 'domain-is-pure',
      severity: 'error',
      from: { path: '^(modules/[^/]+/domain/|packages/primitives/)' },
      to: { path: '(adapters|http|application|db-runtime|node_modules)/' },
    },
    ...deepModuleImportRules,
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    includeOnly: '^(apps|modules|packages)/',
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'types'] },
    reporterOptions: { dot: { collapsePattern: 'node_modules/[^/]+' } },
  },
};
