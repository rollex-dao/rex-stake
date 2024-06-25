import { evmRevert, evmSnapshot, DRE } from '../../helpers/misc-utils';
import { Signer } from 'ethers';
import { getEthersSigners } from '../../helpers/contracts-helpers';
import { tEthereumAddress } from '../../helpers/types';

import chai from 'chai';
// @ts-ignore
import bignumberChai from 'chai-bignumber';
import { StakedREX } from '../../types/StakedREX';
import {
  getRollexIncentivesController,
  getATokenMock,
  getMintableErc20,
  getStakedREX,
  getStakedREXV3,
} from '../../helpers/contracts-accessors';
import { RollexIncentivesController } from '../../types/RollexIncentivesController';
import { MintableErc20 } from '../../types/MintableErc20';
import { ATokenMock } from '../../types/ATokenMock';
import { StakedREXV3 } from '../../types/StakedREXV3';

chai.use(bignumberChai());

export let StakedREXInitializeTimestamp = 0;
export const setStakedREXInitializeTimestamp = (timestamp: number) => {
  StakedREXInitializeTimestamp = timestamp;
};

export interface SignerWithAddress {
  signer: Signer;
  address: tEthereumAddress;
}
export interface TestEnv {
  StakedREXV3: StakedREXV3;
  rewardsVault: SignerWithAddress;
  deployer: SignerWithAddress;
  users: SignerWithAddress[];
  rexToken: MintableErc20;
  rollexIncentivesController: RollexIncentivesController;
  StakedREX: StakedREX;
  aDaiMock: ATokenMock;
  aWethMock: ATokenMock;
}

let buidlerevmSnapshotId: string = '0x1';
const setBuidlerevmSnapshotId = (id: string) => {
  if (DRE.network.name === 'hardhat') {
    buidlerevmSnapshotId = id;
  }
};

const testEnv: TestEnv = {
  deployer: {} as SignerWithAddress,
  users: [] as SignerWithAddress[],
  rexToken: {} as MintableErc20,
  StakedREX: {} as StakedREX,
  StakedREXV3: {} as StakedREXV3,
  rollexIncentivesController: {} as RollexIncentivesController,
  aDaiMock: {} as ATokenMock,
  aWethMock: {} as ATokenMock,
} as TestEnv;

export async function initializeMakeSuite() {
  const [_deployer, _rewardsVault, ...restSigners] = await getEthersSigners();
  const deployer: SignerWithAddress = {
    address: await _deployer.getAddress(),
    signer: _deployer,
  };

  const rewardsVault: SignerWithAddress = {
    address: await _rewardsVault.getAddress(),
    signer: _rewardsVault,
  };

  for (const signer of restSigners) {
    testEnv.users.push({
      signer,
      address: await signer.getAddress(),
    });
  }
  testEnv.deployer = deployer;
  testEnv.rewardsVault = rewardsVault;
  testEnv.StakedREX = await getStakedREX();
  testEnv.StakedREXV3 = await getStakedREXV3();
  testEnv.rollexIncentivesController = await getRollexIncentivesController();
  testEnv.rexToken = await getMintableErc20();
  testEnv.aDaiMock = await getATokenMock({ slug: 'aDai' });
  testEnv.aWethMock = await getATokenMock({ slug: 'aWeth' });
}

export function makeSuite(name: string, tests: (testEnv: TestEnv) => void) {
  describe(name, () => {
    before(async () => {
      setBuidlerevmSnapshotId(await evmSnapshot());
    });
    tests(testEnv);
    after(async () => {
      await evmRevert(buidlerevmSnapshotId);
    });
  });
}
