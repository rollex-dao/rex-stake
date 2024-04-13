import { eEthereumNetwork, tEthereumAddress } from './types';
import { getParamPerNetwork } from './misc-utils';

export const MAX_UINT_AMOUNT =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';
export const MOCK_ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
export const WAD = Math.pow(10, 18).toString();
export const COOLDOWN_SECONDS = '3600'; // 1 hour in seconds
export const UNSTAKE_WINDOW = '1800'; // 30 min in seconds
export const DISTRIBUTION_DURATION = '86400'; // 1 day in seconds

export const STAKED_PSYS_NAME = 'Staked PSYS';
export const STAKED_PSYS_SYMBOL = 'stkPSYS';
export const STAKED_PSYS_DECIMALS = 18;

export const PSYS_GOVERNANCE_V2 = '0xa478dB4f7A6Cb46986d107A8e61410eECf451ae2';
export const PSYS_TOKEN = '0x48023b16c3e81AA7F6eFFbdEB35Bb83f4f31a8fd';
export const WETH = '0x4200000000000000000000000000000000000006';
export const REWARDS_VAULT = '0xE569dFa7c8C7DAdF41314718cE732538968366A6'; //AaveEcossystemReserveV2 as Proxy

export const LONG_EXECUTOR = '0xAeB50343c57a3654D11E41CBeF245B2918Fa2cc9';
export const SHORT_EXECUTOR = LONG_EXECUTOR;
export const ZERO_ADDRESS: tEthereumAddress = '0x0000000000000000000000000000000000000000';

// export const CRP_IMPLEMENTATION = '0xadc74a134082ea85105258407159fbb428a73782'; // BALANCER POOL
// export const BPOOL_FACTORY = '0x9424B1412450D0f8Fc2255FAf6046b98213B76Bd'; // BALANCER POOL
// export const UPGRADABLE_CRP_FACTORY = '0x1156C30b08DbF16281c803EAe0d52Eee7652f10C'; // ADDS BALANCER TOKEN SUPPORT
// export const PROXY_CRP_ADMIN = SHORT_EXECUTOR; // BALANCER POOL
// export const RESERVE_CONTROLER = '0x1E506cbb6721B83B1549fa1558332381Ffa61A93'; // BALANCER POOL

// PEI constants
export const PSM_STAKER_PREMIUM = '2';

// just junk mock

export const RANDOM_ADDRESSES = [
  '0x0000000000000000000000000000000000000221',
  '0x0000000000000000000000000000000000000321',
  '0x0000000000000000000000000000000000000211',
  '0x0000000000000000000000000000000000000251',
  '0x0000000000000000000000000000000000000271',
  '0x0000000000000000000000000000000000000291',
  '0x0000000000000000000000000000000000000321',
  '0x0000000000000000000000000000000000000421',
  '0x0000000000000000000000000000000000000521',
  '0x0000000000000000000000000000000000000621',
  '0x0000000000000000000000000000000000000721',
];

export const getPSYStokenPerNetwork = (network: eEthereumNetwork): tEthereumAddress =>
  getParamPerNetwork<tEthereumAddress>(
    {
      [eEthereumNetwork.hardhat]: ZERO_ADDRESS,
      [eEthereumNetwork.main]: '0x48023b16c3e81AA7F6eFFbdEB35Bb83f4f31a8fd',
    },
    network
  );

export const getCooldownSecondsPerNetwork = (network: eEthereumNetwork): tEthereumAddress =>
  getParamPerNetwork<string>(
    {
      [eEthereumNetwork.hardhat]: COOLDOWN_SECONDS,
      [eEthereumNetwork.main]: '864000', // 10d
    },
    network
  );

export const getUnstakeWindowPerNetwork = (network: eEthereumNetwork): tEthereumAddress =>
  getParamPerNetwork<string>(
    {
      [eEthereumNetwork.hardhat]: UNSTAKE_WINDOW,
      [eEthereumNetwork.main]: '172800', // 2d
    },
    network
  );

export const getPegasysAdminPerNetwork = (network: eEthereumNetwork): tEthereumAddress =>
  getParamPerNetwork<tEthereumAddress>(
    {
      [eEthereumNetwork.hardhat]: ZERO_ADDRESS,
      [eEthereumNetwork.main]: PSYS_GOVERNANCE_V2, // Pegasys Governance
    },
    network
  );

export const getDistributionDurationPerNetwork = (network: eEthereumNetwork): tEthereumAddress =>
  getParamPerNetwork<tEthereumAddress>(
    {
      [eEthereumNetwork.hardhat]: DISTRIBUTION_DURATION,
      [eEthereumNetwork.main]: '12960000', // 5 months (30 days) in seconds
    },
    network
  );

export const getPegasysIncentivesVaultPerNetwork = (network: eEthereumNetwork): tEthereumAddress =>
  getParamPerNetwork<tEthereumAddress>(
    {
      [eEthereumNetwork.hardhat]: ZERO_ADDRESS,
      [eEthereumNetwork.main]: '0x253f7b06c1d60c1fbbc9d82c301327eb86e3ba81',
    },
    network
  );
