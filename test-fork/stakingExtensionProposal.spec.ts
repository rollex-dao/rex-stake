import { expect } from 'chai';
import rawHRE from 'hardhat';
import { BigNumber } from 'ethers';
import { formatEther, parseEther } from 'ethers/lib/utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { JsonRpcSigner } from '@ethersproject/providers';
import { DRE, timeLatest, waitForTx } from '../helpers/misc-utils';

import {
  latestBlock,
  advanceBlockTo,
  impersonateAccountsHardhat,
} from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { IRollexGovernanceV2 } from '../types/IRollexGovernanceV2';
import { ILendingPool } from '../types/ILendingPool';
import {
  StakedREXV3,
  StakedREXV3__factory,
  Erc20,
  SelfdestructTransfer__factory,
  Erc20__factory,
  IDelegationAwareToken__factory,
  StakedTokenV3Rev3,
  StakedTokenBptRev2,
  StakedTokenV3Rev3__factory,
  StakedTokenBptRev2__factory,
} from '../types';
import { spendList } from './helpers';

const {
  RESERVES = 'DAI,GUSD,USDC,USDT,WBTC,WETH',
  POOL_CONFIGURATOR = '0x311bb771e4f8952e6da169b425e7e92d6ac45756',
  POOL_DATA_PROVIDER = '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d',
  ECO_RESERVE = '0x25F2226B597E8F9514B3F68F00f494cF4f286491',
  REX_TOKEN = '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
  IPFS_HASH = 'QmT9qk3CRYbFDWpDFYeAv8T8H1gnongwKhh5J68NLkLir6', // WIP
  REX_GOVERNANCE_V2 = '0xEC568fffba86c094cf06b22134B23074DFE2252c', // mainnet
  LONG_EXECUTOR = '0x61910ecd7e8e942136ce7fe7943f956cea1cc2f7', // mainnet
} = process.env;

if (
  !RESERVES ||
  !POOL_CONFIGURATOR ||
  !POOL_DATA_PROVIDER ||
  !ECO_RESERVE ||
  !REX_TOKEN ||
  !IPFS_HASH ||
  !REX_GOVERNANCE_V2 ||
  !LONG_EXECUTOR
) {
  throw new Error('You have not set correctly the .env file, make sure to read the README.md');
}

const REX_LENDING_POOL = '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9';
const VOTING_DURATION = 64000;

const REX_WHALE = '0x25f2226b597e8f9514b3f68f00f494cf4f286491';
const REX_WHALE_2 = '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8';

const REX_BPT_POOL_TOKEN = '0x41a08648c3766f9f9d85598ff102a08f4ef84f84';
const REX_STAKE = '0x4da27a545c0c5B758a6BA100e3a049001de870f5';
const BPT_STAKE = '0xa1116930326D21fB917d5A27F1E9943A9595fb47';
const DAI_TOKEN = '0x6b175474e89094c44da98b954eedeac495271d0f';
const DAI_HOLDER = '0x72aabd13090af25dbb804f84de6280c697ed1150';
const BPT_WHALE = '0xc1c3f183b71f52b4f5f8f0dd8eb023cdafd2fc93';

describe('Proposal: Extend Staked REX distribution', () => {
  let ethers;

  let whale: JsonRpcSigner;
  let daiHolder: JsonRpcSigner;
  let proposer: SignerWithAddress;
  let gov: IRollexGovernanceV2;
  let pool: ILendingPool;
  let rex: Erc20;
  let rexBpt: Erc20;
  let dai: Erc20;
  let aDAI: Erc20;
  let proposalId: BigNumber;
  let rexStakeV2: StakedREXV3;
  let bptStakeV2: StakedREXV3;
  let stkREXImplAddress: string;
  let stkBptImplAddress: string;
  let StakedREXV3Revision3Implementation: StakedTokenV3Rev3;
  let stakedBptV2Revision2Implementation: StakedTokenBptRev2;
  before(async () => {
    await rawHRE.run('set-dre');
    ethers = DRE.ethers;
    [proposer] = await DRE.ethers.getSigners();

    // Send ether to the REX_WHALE, which is a non payable contract via selfdestruct
    const selfDestructContract = await new SelfdestructTransfer__factory(proposer).deploy();
    await (
      await selfDestructContract.destroyAndTransfer(REX_WHALE, {
        value: ethers.utils.parseEther('1'),
      })
    ).wait();

    // Impersonating holders
    await impersonateAccountsHardhat([
      REX_WHALE,
      REX_WHALE_2,
      BPT_WHALE,
      ...Object.keys(spendList).map((k) => spendList[k].holder),
    ]);

    const whale2 = ethers.provider.getSigner(REX_WHALE_2);
    const bptWhale = ethers.provider.getSigner(BPT_WHALE);
    whale = ethers.provider.getSigner(REX_WHALE);
    daiHolder = ethers.provider.getSigner(DAI_HOLDER);

    // Initialize contracts and tokens
    gov = (await ethers.getContractAt(
      'IRollexGovernanceV2',
      REX_GOVERNANCE_V2,
      proposer
    )) as IRollexGovernanceV2;
    pool = (await ethers.getContractAt(
      'ILendingPool',
      REX_LENDING_POOL,
      proposer
    )) as ILendingPool;

    const { aTokenAddress } = await pool.getReserveData(DAI_TOKEN);

    rex = Erc20__factory.connect(REX_TOKEN, whale);
    REXBpt = Erc20__factory.connect(REX_BPT_POOL_TOKEN, bptWhale);
    rexStakeV2 = StakedREXV3__factory.connect(REX_STAKE, proposer);
    bptStakeV2 = StakedREXV3__factory.connect(BPT_STAKE, proposer);
    dai = Erc20__factory.connect(DAI_TOKEN, daiHolder);
    aDAI = Erc20__factory.connect(aTokenAddress, proposer);

    // Transfer enough REX to proposer
    await (await rex.transfer(proposer.address, parseEther('2000000'))).wait();
    // Transfer enough REX to proposer
    await (await rex.connect(whale2).transfer(proposer.address, parseEther('1200000'))).wait();
    // Transfer DAI to repay future DAI loan
    await (await dai.transfer(proposer.address, parseEther('100000'))).wait();
    // Transfer REX BPT pool shares to proposer
    await (await rexBpt.transfer(proposer.address, parseEther('100'))).wait();
  });

  it('Proposal should be created', async () => {
    await advanceBlockTo((await latestBlock()) + 10);
    const rollexGovToken = IDelegationAwareToken__factory.connect(REX_TOKEN, proposer);

    try {
      const balance = await rex.balanceOf(proposer.address);
      console.log('REX Balance proposer', formatEther(balance));
      const propositionPower = await rollexGovToken.getPowerAtBlock(
        proposer.address,
        ((await latestBlock()) - 1).toString(),
        '1'
      );

      console.log(
        `Proposition power of ${proposer.address} at block - 1`,
        formatEther(propositionPower)
      );
    } catch (error) {
      console.log(error);
    }
    // Submit proposal
    proposalId = await gov.getProposalsCount();

    const { stkREXImpl, stkBptImpl }: { [key: string]: string } = await DRE.run(
      'proposal-stk-extensions'
    );

    stkREXImplAddress = stkREXImpl;
    stkBptImplAddress = stkBptImpl;

    StakedREXV3Revision3Implementation = StakedTokenV3Rev3__factory.connect(
      stkREXImplAddress,
      proposer
    );
    stakedBptV2Revision2Implementation = StakedTokenBptRev2__factory.connect(
      stkBptImplAddress,
      proposer
    );

    // Mine block due flash loan voting protection
    await advanceBlockTo((await latestBlock()) + 1);

    const votingPower = await rollexGovToken.getPowerAtBlock(
      proposer.address,
      ((await latestBlock()) - 1).toString(),
      '0'
    );
    console.log(`Voting power of ${proposer.address} at block - 1`, formatEther(votingPower));

    // Submit vote and advance block to Queue phase
    await (await gov.submitVote(proposalId, true, { gasLimit: 300000 })).wait();
    await advanceBlockTo((await latestBlock()) + VOTING_DURATION + 1);
  });

  it('Proposal should be queued', async () => {
    // Queue and advance block to Execution phase
    try {
      await (await gov.queue(proposalId, { gasLimit: 3000000 })).wait();
    } catch (error) {
      throw error;
    }

    const proposalState = await gov.getProposalState(proposalId);
    expect(proposalState).to.be.equal(5);

  });

  it('Proposal should be executed', async () => {
    // Execute payload
    try {
      await (await gov.execute(proposalId, { gasLimit: 3000000 })).wait();
    } catch (error) {
      throw error;
    }

    console.log('Proposal executed');

    const proposalState = await gov.getProposalState(proposalId);
    expect(proposalState).to.be.equal(7);
  });

  it('Users should be able to stake REX', async () => {
    const amount = parseEther('10');
    await waitForTx(await rex.connect(proposer).approve(rexStakeV2.address, amount));
    await expect(rexStakeV2.connect(proposer).stake(proposer.address, amount)).to.emit(
      rexStakeV2,
      'Staked'
    );
  });

  it('Users should be able to redeem stkREX', async () => {
    const amount = parseEther('1');

    try {
      await waitForTx(await rexStakeV2.cooldown({ gasLimit: 3000000 }));

      const COOLDOWN_SECONDS = await rexStakeV2.COOLDOWN_SECONDS();

      await expect(
        rexStakeV2.connect(proposer).redeem(proposer.address, amount, { gasLimit: 3000000 })
      ).to.emit(rexStakeV2, 'Redeem');
    } catch (error) {
      throw error;
    }
  });

  it('Users should be able to stake REX Pool BPT', async () => {
    const amount = parseEther('10');
    await waitForTx(await rexBpt.connect(proposer).approve(bptStakeV2.address, amount));
    await expect(bptStakeV2.connect(proposer).stake(proposer.address, amount)).to.emit(
      bptStakeV2,
      'Staked'
    );
  });

  it('Users should be able to redeem REX via redeem stkBpt', async () => {
    const amount = parseEther('1');

    try {
      await waitForTx(await bptStakeV2.cooldown({ gasLimit: 3000000 }));

      const COOLDOWN_SECONDS = await bptStakeV2.COOLDOWN_SECONDS();

      await expect(
        bptStakeV2.connect(proposer).redeem(proposer.address, amount, { gasLimit: 3000000 })
      ).to.emit(bptStakeV2, 'Redeem');
    } catch (error) {
      throw error;
    }
  });

  it('Users should be able to transfer stkREX', async () => {
    await expect(rexStakeV2.transfer(whale._address, parseEther('1'))).emit(
      rexStakeV2,
      'Transfer'
    );
  });

  it('Users should be able to transfer stkBPT', async () => {
    await expect(bptStakeV2.transfer(whale._address, parseEther('1'))).emit(bptStakeV2, 'Transfer');
  });

  it('Staked REX Distribution End should be extended', async () => {
    const implDistributionEnd = await StakedREXV3Revision3Implementation.DISTRIBUTION_END();
    const proxyDistributionEnd = await rexStakeV2.DISTRIBUTION_END();

    expect(implDistributionEnd).to.be.eq(proxyDistributionEnd, 'DISTRIBUTION_END SHOULD MATCH');
  });
  it('Staked REX revision should be 3', async () => {
    const revisionImpl = await StakedREXV3Revision3Implementation.REVISION();
    const revisionProxy = await rexStakeV2.REVISION();

    expect(revisionImpl).to.be.eq(revisionProxy, 'DISTRIBUTION_END SHOULD MATCH');
    expect(revisionProxy).to.be.eq('3', 'DISTRIBUTION_END SHOULD MATCH');
  });
  it('Staked BPT  revision should be 2', async () => {
    const revisionImpl = await stakedBptV2Revision2Implementation.REVISION();
    const revisionProxy = await bptStakeV2.REVISION();

    expect(revisionImpl).to.be.eq(revisionProxy, 'DISTRIBUTION_END SHOULD MATCH');
    expect(revisionProxy).to.be.eq('2', 'DISTRIBUTION_END SHOULD MATCH');
  });
  it('Users should be able to deposit DAI at Lending Pool', async () => {
    // Deposit DAI to LendingPool
    await (await dai.connect(proposer).approve(pool.address, parseEther('2000'))).wait();

    const tx = await pool.deposit(dai.address, parseEther('100'), proposer.address, 0);
    expect(tx).to.emit(pool, 'Deposit');
  });

  it('Users should be able to request DAI loan from Lending Pool', async () => {
    // Request DAI loan to LendingPool
    const tx = await pool.borrow(dai.address, parseEther('1'), '2', '0', proposer.address);
    expect(tx).to.emit(pool, 'Borrow');
  });

  it('Users should be able to repay DAI loan from Lending Pool', async () => {
    // Repay DAI variable loan to LendingPool
    await (await dai.connect(proposer).approve(pool.address, MAX_UINT_AMOUNT)).wait();
    const tx = await pool.repay(dai.address, MAX_UINT_AMOUNT, '2', proposer.address);
    expect(tx).to.emit(pool, 'Repay');
  });

  it('Users should be able to withdraw DAI from Lending Pool', async () => {
    // Withdraw DAI from LendingPool
    await (await aDAI.connect(proposer).approve(pool.address, MAX_UINT_AMOUNT)).wait();
    const tx = await pool.withdraw(dai.address, MAX_UINT_AMOUNT, proposer.address);
    expect(tx).to.emit(pool, 'Withdraw');
  });
});
