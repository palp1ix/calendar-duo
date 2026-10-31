import {describe,it,expect} from 'vitest';
import {currentSession,projectHome,sharedMinutes,storyAchievements,storyDays,type Story,type TogetherSession} from './story';
import {emptyData,type Meeting} from '../types';
import {newHome} from './roomLife';
const start=Date.parse('2026-10-31T10:00:00Z'),now=start+3600000;
const session=(extra:Partial<TogetherSession>={}):TogetherSession=>({id:'s',proposer:'a',requested_at:new Date(start).toISOString(),started_at:new Date(start).toISOString(),ends_at:new Date(start+12*3600000).toISOString(),...extra});
const story=(sessions:TogetherSession[]=[]):Story=>({since:'2026-10-01',server_now:new Date(now).toISOString(),sessions,letters:[]});
describe('shared time',()=>{
 it('continues with the app closed and stops at the server limit',()=>{expect(sharedMinutes([],[session()],now)).toBe(60);expect(sharedMinutes([],[session()],start+24*3600000)).toBe(720)});
 it('never counts unconfirmed, cancelled or future sessions',()=>{expect(sharedMinutes([],[session({started_at:null,ends_at:null})],now)).toBe(0);expect(sharedMinutes([],[session()],start-1000)).toBe(0);expect(currentSession(story([session({started_at:null,ends_at:null,cancelled_at:new Date(start).toISOString()})]),start)).toBeUndefined()});
 it('merges duplicate, nested and overlapping calendar intervals',()=>{const meetings=[{status:'completed',start_at:new Date(start-1800000).toISOString(),end_at:new Date(start+1800000).toISOString()}] as Meeting[];expect(sharedMinutes(meetings,[session(),session()],now)).toBe(90)});
 it('only credits growth since planting, including a session already in progress',()=>{expect(sharedMinutes([],[session()],now,start+1800000)).toBe(30)});
 it('expires a pending invitation after 30 minutes',()=>{const s=session({started_at:null,ends_at:null});expect(currentSession(story([s]),start+29*60000)).toBe(s);expect(currentSession(story([s]),start+30*60000)).toBeUndefined()});
});
describe('calendar and living home',()=>{
 it('counts calendar dates, including leap days, without inventing a starting date',()=>{expect(storyDays(null,now)).toBe(0);expect(storyDays('2024-02-28',new Date(2024,2,1,12).getTime())).toBe(2);expect(storyDays('2027-01-01',now)).toBe(0)});
 it('grows plants and unlocks rewards before a meeting ends, without mutating saved state',()=>{const home=newHome(start);home.plants=[{id:'p',species:'mint',name:'Мята',plantedAt:start,baseline:[],growth:0}];const data={...emptyData,home:{revision:1,state:home},story:{...story([session()]),since:null}};const projected=projectHome(data,start+90*60000)!;expect(projected.state.progressUnits).toBe(1);expect(projected.state.plants[0].growth).toBeGreaterThanOrEqual(1/3);expect(data.home.state.plants[0].growth).toBe(0)});
 it('retains earned openings and legacy plant growth',()=>{const home=newHome(start);home.progressUnits=10;home.plants=[{id:'p',species:'mint',name:'Мята',plantedAt:start,baseline:[],growth:.8}];const projected=projectHome({...emptyData,home:{revision:1,state:home},story:story()},now)!;expect(projected.state.progressUnits).toBe(10);expect(projected.state.plants[0].growth).toBe(.8)});
 it('offers 30 truthful achievements and counts a live hour immediately',()=>{expect(storyAchievements(emptyData,now)).toHaveLength(30);expect(storyAchievements(emptyData,now).some(a=>a.unlocked)).toBe(false);const items=storyAchievements({...emptyData,story:story([session()])},now);expect(items.find(a=>a.id==='minutes60')?.unlocked).toBe(true);expect(items.find(a=>a.id==='meetings1')?.unlocked).toBe(false)});
});
