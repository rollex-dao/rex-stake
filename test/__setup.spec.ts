import rawBRE from 'hardhat';
import { Signer, ethers } from 'ethers';
import { getEthersSigners } from '../helpers/contracts-helpers';
import { initializeMakeSuite } from './helpers/make-suite';
import { deployMintableErc20, deployATokenMock } from '../helpers/contracts-accessors';
import { waitForTx } from '../helpers/misc-utils';
import { MintableErc20 } from '../types/MintableErc20';
import { testDeployrexStakeV2, testDeployrexStakeV1 } from './helpers/deploy';

const topUpWalletsWithREX = async (wallets: Signer[], rexToken: MintableErc20, amount: string) => {
  for (const wallet of wallets) {
    await waitForTx(await rexToken.connect(wallet).mint(amount));
  }
};

const buildTestEnv = async (deployer: Signer, vaultOfRewards: Signer, restWallets: Signer[]) => {
  console.time('setup');

  const rexToken = await deployMintableErc20(['REX', 'rex', 18]);

  await waitForTx(await rexToken.connect(vaultOfRewards).mint(ethers.utils.parseEther('1000000')));
  await topUpWalletsWithREX(
    [
      restWallets[0],
      restWallets[1],
      restWallets[2],
      restWallets[3],
      restWallets[4],
      restWallets[5],
    ],
    rexToken,
    ethers.utils.parseEther('100').toString()
  );

  await testDeployrexStakeV2(rexToken, deployer, vaultOfRewards, restWallets);

  const { rollexIncentivesControllerProxy } = await testDeployrexStakeV1(
    rexToken,
    deployer,
    vaultOfRewards,
    restWallets
  );

  await deployATokenMock(rollexIncentivesControllerProxy.address, 'aDai');
  await deployATokenMock(rollexIncentivesControllerProxy.address, 'aWeth');

  console.timeEnd('setup');
};

before(async () => {
  await rawBRE.run('set-dre');
  const [deployer, rewardsVault, ...restWallets] = await getEthersSigners();
  console.log('-> Deploying test environment...');
  await buildTestEnv(deployer, rewardsVault, restWallets);
  await initializeMakeSuite();
  console.log('\n***************');
  console.log('Setup and snapshot finished');
  console.log('***************\n');
});
