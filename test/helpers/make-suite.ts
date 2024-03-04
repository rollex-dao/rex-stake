import { evmRevert, evmSnapshot, DRE } from '../../helpers/misc-utils';
import { Signer } from 'ethers';
import { getEthersSigners } from '../../helpers/contracts-helpers';
import { tEthereumAddress } from '../../helpers/types';

import chai from 'chai';
// @ts-ignore
import bignumberChai from 'chai-bignumber';
import { StakedPSYS } from '../../types/StakedPSYS';
import {
  getPegasysIncentivesController,
  getATokenMock,
  getMintableErc20,
  getStakedPSYS,
  getStakedPSYSV2,
} from '../../helpers/contracts-accessors';
import { PegasysIncentivesController } from '../../types/PegasysIncentivesController';
import { MintableErc20 } from '../../types/MintableErc20';
import { ATokenMock } from '../../types/ATokenMock';
import { StakedPSYSV2 } from '../../types/StakedPSYSV2';

chai.use(bignumberChai());

export let StakedPSYSInitializeTimestamp = 0;
export const setStakedPSYSInitializeTimestamp = (timestamp: number) => {
  StakedPSYSInitializeTimestamp = timestamp;
};

export interface SignerWithAddress {
  signer: Signer;
  address: tEthereumAddress;
}
export interface TestEnv {
  StakedPSYSV2: StakedPSYSV2;
  rewardsVault: SignerWithAddress;
  deployer: SignerWithAddress;
  users: SignerWithAddress[];
  psysToken: MintableErc20;
  pegasysIncentivesController: PegasysIncentivesController;
  StakedPSYS: StakedPSYS;
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
  psysToken: {} as MintableErc20,
  StakedPSYS: {} as StakedPSYS,
  StakedPSYSV2: {} as StakedPSYSV2,
  pegasysIncentivesController: {} as PegasysIncentivesController,
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
  testEnv.StakedPSYS = await getStakedPSYS();
  testEnv.StakedPSYSV2 = await getStakedPSYSV2();
  testEnv.pegasysIncentivesController = await getPegasysIncentivesController();
  testEnv.psysToken = await getMintableErc20();
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
