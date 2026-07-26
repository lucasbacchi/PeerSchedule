function Group() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
      <div className="bg-[#f9fafb] border-3 border-[#e2e8f0] border-solid col-1 h-[60px] ml-0 mt-0 relative rounded-[42px] row-1 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-[319px]" />
      <p className="[word-break:break-word] col-1 font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.2] ml-[120px] mt-[15px] not-italic relative row-1 text-[#64748b] text-[24px] tracking-[-0.48px] whitespace-nowrap">Search</p>
    </div>
  );
}

function Group1() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
      <div className="bg-[#f9fafb] border-3 border-[#e2e8f0] border-solid col-1 h-[60px] ml-0 mt-0 relative rounded-[42px] row-1 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-[134px]" />
      <p className="[word-break:break-word] col-1 font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.2] ml-[39px] mt-[15px] not-italic relative row-1 text-[#64748b] text-[24px] tracking-[-0.48px] whitespace-nowrap">Filter</p>
    </div>
  );
}

function SearchAndFilter() {
  return (
    <div className="absolute content-stretch flex gap-[33px] items-center leading-[0] left-[32px] top-[89px]" data-name="Search and Filter">
      <Group />
      <Group1 />
    </div>
  );
}

function Frame() {
  return (
    <div className="absolute content-stretch drop-shadow-[4px_4px_2px_rgba(0,0,0,0.25)] flex flex-col items-end left-[42px] top-[188px] w-[1226px]">
      <div className="flex items-center justify-center relative shrink-0">
        <div className="-scale-y-100 flex-none">
          <div className="bg-[#f1f5f9] h-[82px] relative rounded-bl-[30px] rounded-br-[30px] w-[1226px]">
            <div aria-hidden className="absolute border-3 border-[#e2e8f0] border-solid inset-[-3px] pointer-events-none rounded-bl-[33px] rounded-br-[33px]" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center relative shrink-0 w-full">
        <div className="-scale-y-100 flex-none w-full">
          <div className="bg-[#f9fafb] h-[82px] relative w-full">
            <div aria-hidden className="absolute border-[#e2e8f0] border-b-5 border-l-3 border-r-3 border-solid inset-[0_-3px_-5px_-3px] pointer-events-none" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center relative shrink-0 w-full">
        <div className="-scale-y-100 flex-none w-full">
          <div className="bg-[#e5e7eb] h-[82px] relative w-full">
            <div aria-hidden className="absolute border-[#e2e8f0] border-l-3 border-r-3 border-solid inset-[0_-3px] pointer-events-none" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center relative shrink-0 w-full">
        <div className="-scale-y-100 flex-none w-full">
          <div className="bg-[#f9fafb] h-[82px] relative w-full">
            <div aria-hidden className="absolute border-[#e2e8f0] border-l-3 border-r-3 border-solid inset-[0_-3px] pointer-events-none" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center relative shrink-0 w-full">
        <div className="-scale-y-100 flex-none w-full">
          <div className="bg-[#e5e7eb] h-[82px] relative w-full">
            <div aria-hidden className="absolute border-[#e2e8f0] border-l-3 border-r-3 border-solid inset-[0_-3px] pointer-events-none" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center relative shrink-0 w-full">
        <div className="-scale-y-100 flex-none w-full">
          <div className="bg-[#f9fafb] h-[82px] relative w-full">
            <div aria-hidden className="absolute border-[#e2e8f0] border-l-3 border-r-3 border-solid inset-[0_-3px] pointer-events-none" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center relative shrink-0 w-full">
        <div className="-scale-y-100 flex-none w-full">
          <div className="bg-[#e5e7eb] h-[82px] relative w-full">
            <div aria-hidden className="absolute border-[#e2e8f0] border-l-3 border-r-3 border-solid inset-[0_-3px] pointer-events-none" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center relative shrink-0">
        <div className="-scale-y-100 flex-none">
          <div className="bg-[#f9fafb] h-[82px] relative rounded-tl-[30px] rounded-tr-[30px] w-[1226px]">
            <div aria-hidden className="absolute border-[#e2e8f0] border-l-3 border-r-3 border-solid border-t-3 inset-[-3px_-3px_0_-3px] pointer-events-none rounded-tl-[33px] rounded-tr-[33px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Group2() {
  return (
    <div className="absolute contents left-[106px] top-[188px]">
      <p className="[word-break:break-word] absolute font-['Inter:Bold',sans-serif] font-bold leading-[normal] left-[1132px] not-italic text-[#0f172a] text-[24px] top-[214px] whitespace-nowrap">Actions</p>
      <div className="absolute flex h-[656px] items-center justify-center left-[1090px] top-[188px] w-0">
        <div className="-rotate-90 flex-none">
          <div className="h-0 relative w-[656px]">
            <div className="absolute inset-[-1px_0_0_0]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 656 1">
                <line id="Line 4" stroke="var(--stroke-0, #7F8791)" x2="656" y1="0.5" y2="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <p className="[word-break:break-word] absolute font-['Inter:Bold',sans-serif] font-bold leading-[normal] left-[863px] not-italic text-[#0f172a] text-[24px] top-[214px] whitespace-nowrap">Last Updated</p>
      <div className="absolute flex h-[656px] items-center justify-center left-[793px] top-[188px] w-0">
        <div className="-rotate-90 flex-none">
          <div className="h-0 relative w-[656px]">
            <div className="absolute inset-[-1px_0_0_0]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 656 1">
                <line id="Line 4" stroke="var(--stroke-0, #7F8791)" x2="656" y1="0.5" y2="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <p className="[word-break:break-word] absolute font-['Inter:Bold',sans-serif] font-bold leading-[normal] left-[640px] not-italic text-[#0f172a] text-[24px] top-[214px] whitespace-nowrap">Members</p>
      <div className="absolute flex h-[656px] items-center justify-center left-[599px] top-[188px] w-0">
        <div className="-rotate-90 flex-none">
          <div className="h-0 relative w-[656px]">
            <div className="absolute inset-[-1px_0_0_0]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 656 1">
                <line id="Line 4" stroke="var(--stroke-0, #7F8791)" x2="656" y1="0.5" y2="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <p className="[word-break:break-word] absolute font-['Inter:Bold',sans-serif] font-bold leading-[normal] left-[436px] not-italic text-[#0f172a] text-[24px] top-[214px] whitespace-nowrap">Owner</p>
      <div className="absolute flex h-[656px] items-center justify-center left-[351px] top-[188px] w-0">
        <div className="-rotate-90 flex-none">
          <div className="h-0 relative w-[656px]">
            <div className="absolute inset-[-1px_0_0_0]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 656 1">
                <line id="Line 4" stroke="var(--stroke-0, #7F8791)" x2="656" y1="0.5" y2="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <p className="[word-break:break-word] absolute font-['Inter:Bold',sans-serif] font-bold leading-[normal] left-[106px] not-italic text-[#0f172a] text-[24px] top-[214px] whitespace-nowrap">Calendar Name</p>
    </div>
  );
}

function CalendarSearch() {
  return (
    <section className="mx-auto mt-[40px] w-[1305px]" data-name="Calendar Search">
      <div className="relative h-[909px] overflow-hidden rounded-[25px] border border-[#e2e8f0] bg-white shadow-[2px_4px_4px_0px_rgba(0,0,0,0.25)]">
        <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.2] left-[32px] not-italic text-[#0f172a] text-[24px] top-[21px] tracking-[-0.48px] whitespace-nowrap">Calendar Search</p>
        <SearchAndFilter />
        <Frame />
        <Group2 />
      </div>
    </section>
  );
}

function Calendar() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="Calendar 1">
      <div className="bg-[#f9fafb] col-1 h-[396px] ml-0 mt-0 relative rounded-[5px] row-1 shadow-[2px_4px_4px_0px_rgba(0,0,0,0.25)] w-[390px]">
        <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-[-1px] pointer-events-none rounded-[6px]" />
      </div>
      <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal h-[23px] leading-[1.2] ml-[28.5px] mt-[186.5px] not-italic relative row-1 text-[#64748b] text-[20px] w-[335px]">IFrame of Calendar Here</p>
      <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal h-[24px] leading-[1.2] ml-[28.23px] mt-[34.5px] not-italic relative row-1 text-[#0f172a] text-[20px] w-[130px]">Calendar 1</p>
    </div>
  );
}

function Calendar1() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="Calendar 2">
      <div className="bg-[#f9fafb] col-1 h-[395px] ml-0 mt-0 relative rounded-[5px] row-1 shadow-[2px_4px_4px_0px_rgba(0,0,0,0.25)] w-[390px]">
        <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-[-1px] pointer-events-none rounded-[6px]" />
      </div>
      <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal h-[23px] leading-[1.2] ml-[27.5px] mt-[186px] not-italic relative row-1 text-[#64748b] text-[20px] w-[335px]">IFrame of Calendar Here</p>
      <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal h-[110.233px] leading-[1.2] ml-[27.73px] mt-[34px] not-italic relative row-1 text-[#0f172a] text-[20px] w-[130px]">Calendar 2</p>
    </div>
  );
}

function Calendar2() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="Calendar 3">
      <div className="bg-[#f9fafb] col-1 h-[395px] ml-0 mt-0 relative rounded-[5px] row-1 shadow-[2px_4px_4px_0px_rgba(0,0,0,0.25)] w-[390px]">
        <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-[-1px] pointer-events-none rounded-[6px]" />
      </div>
      <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal h-[23px] leading-[1.2] ml-[27.5px] mt-[186px] not-italic relative row-1 text-[#64748b] text-[20px] w-[335px]">IFrame of Calendar Here</p>
      <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal h-[110.233px] leading-[1.2] ml-[27.73px] mt-[34px] not-italic relative row-1 text-[#0f172a] text-[20px] w-[130px]">Calendar 3</p>
    </div>
  );
}

function Events() {
  return (
    <div className="-translate-y-1/2 absolute content-stretch flex gap-[24px] h-[477px] items-center justify-center leading-[0] left-0 top-[calc(50%+9.5px)] w-[1305px]" data-name="Events">
      <Calendar />
      <Calendar1 />
      <Calendar2 />
    </div>
  );
}

function CalendarQuickLinks() {
  return (
    <section className="relative mx-auto h-[580px] w-[1305px] overflow-visible" data-name="Calendar Quick Links">
      <div className="absolute bg-white h-[565px] left-0 rounded-[25px] border border-[#e2e8f0] shadow-[2px_4px_4px_0px_rgba(0,0,0,0.25)] top-0 w-full" />
      <Events />
      <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.2] left-[32px] not-italic text-[#0f172a] text-[24px] top-[21px] tracking-[-0.48px] whitespace-nowrap">Calendar Quick Links</p>
    </section>
  );
}

function Title() {
  return (
    <div data-name="Title">
      <h1 className="text-[32px] font-bold text-[#0f172a] tracking-tight mb-5">Choose A Calendar</h1>
    </div>
  );
}

export default function ChoosePage() {
  return (
    <div className="bg-[#f8fafc] min-h-screen flex flex-col overflow-x-hidden overflow-y-auto font-['Inter',sans-serif] pb-12" data-name="Choose Page">
      <title>Choose | PeerSchedule</title>
      <main className="flex-1 px-10 pt-6 pb-8 flex flex-col gap-4">
        <Title />
        <CalendarQuickLinks />
        <CalendarSearch />
      </main>
    </div>
  );
}
