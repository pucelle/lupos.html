import {CacheableIfBlock} from './if'


/** 
 * Make it by compiling:
 * 
 * ```html
 * 	<lu:switch ${...} cache>
 * 		<lu:case ${...}>...</lu:case>
 * 		<lu:case ${...}>...</lu:case>
 * 		<lu:default>...</lu:default>
 *  </lu:switch>
 * ```
 */
export const CacheableSwitchBlock = CacheableIfBlock
