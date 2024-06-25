import BigNumber from 'bignumber.js';

export enum eEthereumNetwork {
  coverage = 'coverage',
  hardhat = 'hardhat',
  kovan = 'kovan',
  ropsten = 'ropsten',
  main = 'main',
  goerli = 'goerli',
}

export enum eContractid {
  DistributionManager = 'DistributionManager',
  StakedREX = 'StakedREX',
  StakedREXV3 = 'StakedREXV3',
  StakedREXImpl = 'StakedREXImpl',
  RollexIncentivesController = 'RollexIncentivesController',
  IERC20Detailed = 'IERC20Detailed',
  AdminUpgradeabilityProxy = 'AdminUpgradeabilityProxy',
  InitializableAdminUpgradeabilityProxy = 'InitializableAdminUpgradeabilityProxy',
  MintableErc20 = 'MintableErc20',
  LendingPoolMock = 'LendingPoolMock',
  MockTransferHook = 'MockTransferHook',
  ATokenMock = 'ATokenMock',
  DoubleTransferHelper = 'DoubleTransferHelper',
  ICRPFactory = 'ICRPFactory',
  StakedTokenV3 = 'StakedTokenV3',
  IConfigurableRightsPool = 'IConfigurableRightsPool',
  IBPool = 'IBPool',
  IControllerRollexEcosystemReserve = 'IControllerRollexEcosystemReserve',
  MockSelfDestruct = 'SelfdestructTransfer',
  StakedTokenV3Rev3 = 'StakedTokenV3Rev3',
  StakedTokenBptRev2 = 'StakedTokenBptRev2',
  RollexStakingHelper = 'RollexStakingHelper',
  StakeUIHelper = 'StakeUIHelper',
  StakedTokenDataProvider = 'StakedTokenDataProvider',
}

export type tEthereumAddress = string;
export type tStringTokenBigUnits = string; // 1 ETH, or 10e6 USDC or 10e18 DAI
export type tBigNumberTokenBigUnits = BigNumber;
// 1 wei, or 1 basic unit of USDC, or 1 basic unit of DAI
export type tStringTokenSmallUnits = string;
export type tBigNumberTokenSmallUnits = BigNumber;

export interface iParamsPerNetwork<T> {
  [eEthereumNetwork.hardhat]: T;
  [eEthereumNetwork.main]: T;
}
