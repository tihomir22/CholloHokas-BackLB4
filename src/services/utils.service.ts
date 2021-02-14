import {/* inject, */ BindingScope, injectable} from '@loopback/core';
import {Filter, repository} from '@loopback/repository';
import {ResultShrinkDatabase} from '../interfaces/ResultUtils';
import {Block} from '../models';
import {
  BlockRepository,
  CachimbaModelRepository,
  SiteRepository,
} from '../repositories';

@injectable({scope: BindingScope.TRANSIENT})
export class UtilsService {
  constructor(
    @repository(BlockRepository) private blockRepo: BlockRepository,
    @repository(SiteRepository) private siteRepo: SiteRepository,
    @repository(CachimbaModelRepository)
    private cachimbaRepo: CachimbaModelRepository,
  ) {}

  public async shrinkDatabase() {
    let weekAgo = new Date();
    let auxWeekAgo = weekAgo.getDate() - 21;
    weekAgo.setDate(auxWeekAgo);

    let filter: Filter<Block> = {
      include: [
        {
          relation: 'minedIds',
          scope: {
            include: [{relation: 'data'}],
          },
        },
      ],
      where: {dateBlock: {lte: weekAgo}},
    };
    let deletedBlocks = 0,
      deletedSites = 0,
      deletedHookas = 0;
    let allBlocksTodelete = await this.blockRepo.find(filter);
    console.log('Blocks to delete ' + allBlocksTodelete);
    for (const block of allBlocksTodelete) {
      if (block.minedIds && Array.isArray(block.minedIds)) {
        for (const site of block.minedIds) {
          if (site.data && Array.isArray(site.data)) {
            let shishasIds = site.data.map(entry => entry.id);
            console.log('deleting ' + shishasIds.length + ' shishas');
            await this.cachimbaRepo.deleteAll({
              id: {inq: shishasIds},
            });
            deletedHookas = deletedHookas + shishasIds.length;
          }
          console.log('deleting site', site.id);
          await this.siteRepo.deleteById(site.id);
          deletedSites++;
        }
      }
      console.log('deleting block', block.id);
      await this.blockRepo.deleteById(block.id);
      deletedBlocks++;
    }
    console.log([deletedHookas, deletedSites, deletedBlocks]);
    return Promise.resolve({
      deletedBlocks: deletedBlocks,
      deletedSites: deletedSites,
      deletedHookas: deletedHookas,
    } as ResultShrinkDatabase);
  }
}