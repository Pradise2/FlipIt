

const Profile = () => {
  return (
    <div className="bg-background dark:bg-background dark:text-primary-foreground p-4 rounded-lg shadow-md">
      <div className="flex items-center mb-4">
        <img className="w-12 h-12 rounded-full mr-3" src="https://placehold.co/48x48" alt="User Avatar" />
        <div>
          <h2 className="text-lg font-semibold">address</h2>
          <span className="text-muted-foreground">ad💰 0</span>
        </div>
      </div>
      <div className="flex justify-between mb-2">
        <span className="text-primary font-medium">Holdings</span>
        <span className="text-primary font-medium">Activity</span>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 text-muted-foreground">COLLECTIVE</th>
            <th className="py-2 text-muted-foreground">HOLDING</th>
            <th className="py-2 text-muted-foreground">PRICE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={3} className="py-4 text-center text-muted-foreground">No activity yet...</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default Profile
