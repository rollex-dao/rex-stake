import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import { getAddress } from 'ethers/lib/utils';
import { ZERO_ADDRESS } from '../../helpers/constants';
import { deployStakedTokenDataProvider } from '../../helpers/contracts-accessors';
import { checkVerification } from '../../helpers/etherscan-verification';
import { registerContractInJsonDb } from '../../helpers/contracts-helpers';

const { StakedTokenDataProvider, StakedTokenV3Rev3 } = eContractid;

task(`deploy-${StakedTokenDataProvider}`, `Deploys the ${StakedTokenDataProvider} contract`)
  .addParam('stkPsys', `The address of the ${StakedTokenV3Rev3} contract`)
  .addParam('ethOracle', 'The address of the eth price feed contract')
  .addParam('rexOracle', 'The address of the rex price feed contract')
  .addFlag('verify', 'Verify StakedREXV3 contract via Etherscan API.')
  .setAction(
    async (
      { stkPsys: stkREXAddress, ethOracle: ethOracleAddress, rexOracle: rexOracleAddress, verify },
      localBRE
    ) => {
      await localBRE.run('set-dre');
      if (verify) {
        checkVerification();
      }
      if (!stkREXAddress || getAddress(stkREXAddress) === ZERO_ADDRESS) {
        throw `address of stkREX contract is invalid`;
      }
      if (!ethOracleAddress || getAddress(ethOracleAddress) === ZERO_ADDRESS) {
        throw `address of ethOracle contract is invalid`;
      }
      if (!rexOracleAddress || getAddress(rexOracleAddress) === ZERO_ADDRESS) {
        throw `address of rexOracle contract is invalid`;
      }

      const stakedTokenDataProvider = await deployStakedTokenDataProvider(
        [stkREXAddress, ethOracleAddress, rexOracleAddress],
        verify
      );

      await stakedTokenDataProvider.deployTransaction.wait();
      await registerContractInJsonDb(StakedTokenDataProvider, stakedTokenDataProvider);

      console.log('StakedTokenDataProvider deployed to ', stakedTokenDataProvider.address);
    }
  );
