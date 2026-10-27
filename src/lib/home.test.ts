import {expect,it} from 'vitest';
import {newerHome} from './home';
import {newHome} from './roomLife';
it('late polling responses never overwrite a newer mutation',()=>{const current={revision:8,state:newHome(0)},stale={revision:7,state:newHome(0)};expect(newerHome(current,stale)).toBe(current);expect(newerHome(current,null)).toBe(current)});
it('accepts the initial snapshot and newer shared state',()=>{const first={revision:0,state:newHome(0)},next={revision:1,state:newHome(0)};expect(newerHome(null,first)).toBe(first);expect(newerHome(first,next)).toBe(next)});
